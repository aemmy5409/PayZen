import { prisma } from "../lib/prisma.js"
import { generatePdf } from "../utils/generatePdf.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateInvoiceNumber = async(userId) => {
    const count = await prisma.invoice.count({ where: { userId } })
    return String(count + 1).padStart(5, "0");
}


export const createInvoice = async(req, res) => {

    const {clientId, client, issueDate, dueDate, purchaseOrder, items, status = "DRAFT", logoUrl} = req.body
    let finalClientId = clientId;

    try {
        if(client && !clientId) {
            const existing = await prisma.client.findFirst({
                where: { userId: req.userId, name: client.name}
            })
            if(existing) {
                finalClientId = existing.id
            }else {
                const newClient = await prisma.client.create({
                    data: {
                        ...client,
                        userId: req.userId
                    }
                })
                finalClientId = newClient.id;
            }
        }

        const invoiceItem = items.map(item => ({
            description: item.description?.trim() || "Service",
            quantity: Number(item.quantity) || 1,
            rate: Number(item.rate) || 0,
            discount: Number(item.discount || 0),
            amount: (Number(item.quantity) || 1) * (Number(item.rate) || 0) * (1 - (Number(item.discount || 0) / 100))
        }));

        const total = invoiceItem.reduce((sum, i) => sum + i.amount,  0).toFixed(2)

        const invoice = await prisma.invoice.create({
            data: {
                invoice_number: await generateInvoiceNumber(req.userId),
                userId: req.userId,
                clientId: finalClientId,
                issue_date: new Date(issueDate),
                due_date: new Date(dueDate),
                purchase_order: purchaseOrder,
                logo_url: logoUrl,
                status: status.toUpperCase(),
                total,
                amount_due: status === "PAID" ? 0 : total,
                items: {
                    create: invoiceItem.map(i => ({
                        description: i.description,
                        quantity: i.quantity,
                        rate: i.rate,
                        discount: i.discount,
                        amount: i.amount
                    }))
                }
            },
            include: {
                client: true,
                items: true
            }
        })
        return res.status(201).json({"success": true, invoice})

    } catch (err) {
        console.log("Error creating invoice: ", err.message);
        return res.status(500).json({"success": false, "message": "Failed to create invoice"})
    } 
}

export const getInvoices = async(req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit

    let where = {userId: req.userId};
    if(req.query.status) where.status = { in: req.query.status.split(",") }
    if(req.query.client) where.client = { name: { contains: req.query.client, mode: "insensitive" } }

    try {
        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { issue_date: "desc" },
                include: { client: true }
            }),
            prisma.invoice.count({ where }) 
        ])

        return res.status(200).json({
            "success": true,
            data: invoices,
            meta: { total, page, limit, totalPage: Math.ceil(total / limit)}
        })
    } catch (err) {
        return res.status(500).json({
            "success": false,
            "message": "An error occured while fetching invoices"
        });
    }
}

export const getInvoiceSummary = async(req, res) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    try {
        const [overdue, outstanding, paidThisMonth, uncollectible] = await Promise.all([
            prisma.invoice.aggregate({
                where: {userId: req.userId, status: "OVERDUE",  amount_due: { gt: 0 }},
                _sum: { amount_due: true }
            }),
            prisma.invoice.aggregate({
                where: {
                  userId: req.userId,
                  status: { in: ["SENT", "OVERDUE"] },
                  amount_due: { gt: 0 } 
                },
                _sum: {
                  amount_due: true
                }
              }),
            prisma.invoice.aggregate({
                where: { userId: req.userId, status: "PAID", update_at: { gte: monthStart }},
                _sum: { total: true }
            }),
            prisma.invoice.aggregate({
                where: { userId: req.userId, status: "UNCOLLECTIBLE" },
                _sum: { total: true }
            })
        ]);

        res.status(200).json({
            "success": true,
            overdue: Number(overdue._sum.amount_due || 0),
            outstanding: Number(outstanding._sum.amount_due || 0),
            getPaidThisMonth: Number(paidThisMonth._sum.total || 0),
            uncollectible: Number(uncollectible._sum.total || 0),
        });

    } catch (err) {
        console.log("Error in invoices summary: ", err.message)
        return res.status(500).json({"success": false, "message": "An error occurred while generating invoice summary"});
    }
}

export const downloadInvoice = async(req, res) => {
    const id = Number(req.params.id)
     
    if(!id) {
        return res.status(401).json({"succes": false, "message": "Bad request, id paramatere required"})
    }

    const invoice = await prisma.invoice.findFirst({
        where: {
            id,
            userId: req.userId
        },
        include: {client: true, items: true}
    })

    if(!invoice) {
        return res.status(404).json({"success": false, "message": "Not found, Invoice doesn't exist"})
    }

    const user = await prisma.user.findUnique({ where: {id: req.userId}});
    if(!user) {
        return res.status(401).json({"success": false, "message": ""})
    }

    const pdf = await generatePdf({user, invoice})

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Invoice_${invoice.invoice_number}.pdf`
    })

    res.send(pdf);
}


export const uploadLogo = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No file uploaded"
        });
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${logoUrl}`;

    const invoiceId = Number(req.body.invoiceId) || null;

    try {
        let updatedInvoiceId = null;

        if (invoiceId) {

            if (isNaN(invoiceId)) {
                // Clean up uploaded file if invoiceId is invalid
                await fs.promises.unlink(req.file.path).catch(() => {});
                return res.status(400).json({
                    success: false,
                    message: "Invalid invoiceId"
                });
            }

            const result = await prisma.invoice.updateMany({
                where: {
                    id: invoiceId,
                    userId: req.userId
                },
                data: {
                    logo_url: logoUrl
                }
            });

            if (result.count === 0) {
                // Invoice not found → delete uploaded file
                try {
                    await fs.promises.unlink(req.file.path);
                } catch (unlinkErr) {
                    console.warn("Failed to delete orphaned logo:", unlinkErr);
                }
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found"
                });
            }
            updatedInvoiceId = Number(invoiceId);
        }

        return res.status(200).json({
            success: true,
            logoUrl: fullUrl,
            invoiceId: updatedInvoiceId || null
        });

    } catch (err) {
        console.log("Error in uploadLogo:", err);

        // Always try to clean up the uploaded file on error
        await fs.promises.unlink(req.file.path).catch(() => {});

        return res.status(500).json({
            success: false,
            message: "Failed to process logo upload"
        });
    
    }
};
