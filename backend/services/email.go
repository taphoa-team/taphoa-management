package services

import (
	"encoding/base64"
	"fmt"
	"html"
	"log"
	"net/smtp"
	"os"
	"strings"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"gorm.io/gorm"
)

// SendAlertEmail gửi email cảnh báo hết hạn + hàng sắp hết kho
// Trả về error nếu gửi thất bại
func SendAlertEmail() error {
	// Đọc cấu hình từ env
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	recipients := os.Getenv("ALERT_RECIPIENTS") // nhiều email cách nhau bởi dấu phẩy

	if smtpEmail == "" || smtpPassword == "" || recipients == "" {
		return fmt.Errorf("missing email config: SMTP_EMAIL, SMTP_PASSWORD, or ALERT_RECIPIENTS")
	}

	recipientList := strings.Split(recipients, ",")
	for i := range recipientList {
		recipientList[i] = strings.TrimSpace(recipientList[i])
	}

	// Thu thập dữ liệu cảnh báo
	body, hasAlerts := buildAlertEmailBody()
	if !hasAlerts {
		log.Println("[Email] No alerts to send, skipping")
		return nil
	}

	// Tạo email
	subject := fmt.Sprintf("Cảnh báo cửa hàng - %s", time.Now().Format("02/01/2006"))
	msg := buildMIMEMessage(smtpEmail, recipientList, subject, body)

	// Gửi qua Gmail SMTP
	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, "smtp.gmail.com")
	err := smtp.SendMail("smtp.gmail.com:587", auth, smtpEmail, recipientList, []byte(msg))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("[Email] Alert email sent to %s", recipients)
	return nil
}

// buildMIMEMessage tạo email với UTF-8 (tiếng Việt)
func buildMIMEMessage(from string, to []string, subject, body string) string {
	return fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: =?UTF-8?B?%s?=\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n%s",
		from,
		strings.Join(to, ","),
		base64Encode(subject),
		body,
	)
}

// buildAlertEmailBody thu thập dữ liệu và tạo HTML email
// Trả về (html, hasAlerts)
func buildAlertEmailBody() (string, bool) {
	now := time.Now()
	deadline7 := now.AddDate(0, 0, 7)

	// Một query duy nhất — lấy tất cả lô hết hạn trong 7 ngày (bao gồm đã hết hạn)
	// Sau đó phân loại trong Go: expired vs upcoming
	var allExpiryBatches []models.ProductBatch
	config.DB.Preload("Product").
		Where("quantity > 0 AND expiry_date IS NOT NULL AND expiry_date <= ?", deadline7).
		Order("expiry_date ASC").
		Limit(40).
		Find(&allExpiryBatches)

	var expiredBatches, upcomingBatches []models.ProductBatch
	for _, b := range allExpiryBatches {
		if b.ExpiryDate.Before(now) || b.ExpiryDate.Equal(now) {
			expiredBatches = append(expiredBatches, b)
		} else {
			upcomingBatches = append(upcomingBatches, b)
		}
	}

	// Hàng sắp hết / hết kho
	var products []models.Product
	config.DB.Where("is_active = ?", true).Find(&products)

	stockMap := GetStockMap(config.DB)

	type lowStockItem struct {
		Name    string
		Stock   int
		MinQty  int
		Warning string
	}
	var lowStockItems []lowStockItem
	for _, p := range products {
		stock := stockMap[p.ID]
		if stock > p.MinQuantity {
			continue
		}
		warning := "Sắp hết"
		if stock == 0 {
			warning = "Hết hàng"
		}
		lowStockItems = append(lowStockItems, lowStockItem{
			Name:    p.Name,
			Stock:   stock,
			MinQty:  p.MinQuantity,
			Warning: warning,
		})
	}

	if len(allExpiryBatches) == 0 && len(lowStockItems) == 0 {
		return "", false
	}

	// Build HTML with strings.Builder
	var b strings.Builder
	b.WriteString(`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">`)
	fmt.Fprintf(&b, `<h2 style="color:#0d9488">Báo cáo cảnh báo — %s</h2>`, now.Format("02/01/2006"))

	// Hàng đã hết hạn
	if len(expiredBatches) > 0 {
		b.WriteString(`<h3 style="color:#ff4d4f">🔴 Hàng đã hết hạn (còn trong kho)</h3>`)
		b.WriteString(`<table style="width:100%;border-collapse:collapse">`)
		b.WriteString(`<tr style="background:#fff1f0"><th style="padding:8px;border:1px solid #ddd;text-align:left">Sản phẩm</th><th style="padding:8px;border:1px solid #ddd">SL</th><th style="padding:8px;border:1px solid #ddd">HSD</th></tr>`)
		for _, batch := range expiredBatches {
			fmt.Fprintf(&b,
				`<tr><td style="padding:8px;border:1px solid #ddd">%s</td><td style="padding:8px;border:1px solid #ddd;text-align:center">%d</td><td style="padding:8px;border:1px solid #ddd;text-align:center;color:#ff4d4f">%s</td></tr>`,
				html.EscapeString(batch.Product.Name), batch.Quantity, batch.ExpiryDate.Format("02/01/2006"),
			)
		}
		b.WriteString(`</table><br>`)
	}

	// Hàng sắp hết hạn (7 ngày tới)
	if len(upcomingBatches) > 0 {
		b.WriteString(`<h3 style="color:#fa8c16">🟠 Hàng sắp hết hạn (7 ngày tới)</h3>`)
		b.WriteString(`<table style="width:100%;border-collapse:collapse">`)
		b.WriteString(`<tr style="background:#fff7e6"><th style="padding:8px;border:1px solid #ddd;text-align:left">Sản phẩm</th><th style="padding:8px;border:1px solid #ddd">SL</th><th style="padding:8px;border:1px solid #ddd">HSD</th><th style="padding:8px;border:1px solid #ddd">Còn</th></tr>`)
		for _, batch := range upcomingBatches {
			daysLeft := int(batch.ExpiryDate.Sub(now).Hours()/24) + 1
			fmt.Fprintf(&b,
				`<tr><td style="padding:8px;border:1px solid #ddd">%s</td><td style="padding:8px;border:1px solid #ddd;text-align:center">%d</td><td style="padding:8px;border:1px solid #ddd;text-align:center">%s</td><td style="padding:8px;border:1px solid #ddd;text-align:center;color:#fa8c16">%d ngày</td></tr>`,
				html.EscapeString(batch.Product.Name), batch.Quantity, batch.ExpiryDate.Format("02/01/2006"), daysLeft,
			)
		}
		b.WriteString(`</table><br>`)
	}

	// Hàng sắp hết / hết kho
	if len(lowStockItems) > 0 {
		b.WriteString(`<h3 style="color:#faad14">🟡 Hàng sắp hết / hết kho</h3>`)
		b.WriteString(`<table style="width:100%;border-collapse:collapse">`)
		b.WriteString(`<tr style="background:#fffbe6"><th style="padding:8px;border:1px solid #ddd;text-align:left">Sản phẩm</th><th style="padding:8px;border:1px solid #ddd">Tồn kho</th><th style="padding:8px;border:1px solid #ddd">Tối thiểu</th><th style="padding:8px;border:1px solid #ddd">Trạng thái</th></tr>`)
		for _, item := range lowStockItems {
			color := "#faad14"
			if item.Warning == "Hết hàng" {
				color = "#ff4d4f"
			}
			fmt.Fprintf(&b,
				`<tr><td style="padding:8px;border:1px solid #ddd">%s</td><td style="padding:8px;border:1px solid #ddd;text-align:center">%d</td><td style="padding:8px;border:1px solid #ddd;text-align:center">%d</td><td style="padding:8px;border:1px solid #ddd;text-align:center;color:%s">%s</td></tr>`,
				html.EscapeString(item.Name), item.Stock, item.MinQty, color, item.Warning,
			)
		}
		b.WriteString(`</table><br>`)
	}

	b.WriteString(`<p style="color:#999;font-size:12px">Email tự động từ hệ thống Quản lý Tạp Hóa</p>`)
	b.WriteString(`</div>`)

	return b.String(), true
}

// GetStockMap tính tồn kho hiện tại, hỗ trợ filter theo product IDs
func GetStockMap(db *gorm.DB, productIDs ...[]uint) map[uint]int {
	type stockRow struct {
		ProductID uint
		Total     int
	}
	var rows []stockRow
	query := db.Model(&models.ProductBatch{}).
		Select("product_id, COALESCE(SUM(quantity), 0) as total").
		Group("product_id")
	if len(productIDs) > 0 && len(productIDs[0]) > 0 {
		query = query.Where("product_id IN ?", productIDs[0])
	}
	query.Find(&rows)

	m := make(map[uint]int, len(rows))
	for _, r := range rows {
		m[r.ProductID] = r.Total
	}
	return m
}

// base64Encode cho subject email UTF-8
func base64Encode(s string) string {
	return base64.StdEncoding.EncodeToString([]byte(s))
}
