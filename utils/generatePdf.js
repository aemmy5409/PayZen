import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

export const generatePdf = async({user, invoice}) => {
    let html = fs.readFileSync(path.join(__dirname, "/../../templates/invoice.html"), 'utf-8');

    let logoHtml = `<h1 style="font-size: 28px; color: #6366f1; margin: 0;">
                    ${user.company_name || user.name || "PayZen"}
                  </h1>`;

    if (invoice.logo_url) {
        const logoPath = path.join(process.cwd(), "uploads", path.basename(invoice.logo_url));
        
        if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const logoMime = invoice.logo_url.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        logoHtml = `<img src="data:${logoMime};base64,${logoBase64}" 
                        class="logo" 
                        style="max-height: 90px; max-width: 200px; object-fit: contain;" />`;
        }
        // If file missing → fallback to company name
    }
    
    html = html
        .replace("<!--LOGO_PLACEHOLDER-->", logoHtml)
        .replace("<!--BUSINESS-->", user.company_name || user.name)
        .replace("<!--EMAIL-->", user.email)
        .replace("<!--CLIENT_NAME-->", invoice.client?.name || "")
        .replace("<!--CLIENT_EMAIL-->", invoice.client?.email || "")
        .replace("<!--NUMBER-->", invoice.invoice_number)
        .replace("<!--DATE-->", new Date(invoice.issue_date).toLocaleDateString())
        .replace("<!--DUE-->", new Date(invoice.due_date).toLocaleDateString())
        .replace("<!--TOTAL-->", invoice.total.toFixed(2));

    let itemRows = "";
    invoice.items.forEach(item => {
        itemRows += `
            <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.rate.toFixed(2)}</td>
                <td>${item.amount.toFixed(2)}</td>
            </tr>
        `
    });

    html = html.replace("<!--ITEMS-->", itemRows);

    const browser = await puppeteer.launch({headless: true, args: ["--no-sandbox"]});
    const page = await browser.newPage();
    await page.setContent(html, {waitUntil: "networkidle0"});
    const pdf = await page.pdf({format: "A4", printBackground: true});
    await browser.close()

    return pdf;
}
