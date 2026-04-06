package services

import (
	"log"
	"os"
	"time"
)

// StartAlertScheduler chạy goroutine gửi email cảnh báo mỗi ngày lúc 7:00 sáng
// Chỉ chạy khi SMTP_EMAIL đã được cấu hình
func StartAlertScheduler() {
	if os.Getenv("SMTP_EMAIL") == "" {
		log.Println("[Scheduler] SMTP_EMAIL not set, email alerts disabled")
		return
	}

	go func() {
		for {
			now := time.Now()

			// Tính thời điểm 7:00 sáng ngày tiếp theo
			next := time.Date(now.Year(), now.Month(), now.Day(), 7, 0, 0, 0, now.Location())
			if now.After(next) {
				next = next.AddDate(0, 0, 1)
			}

			sleepDuration := next.Sub(now)
			log.Printf("[Scheduler] Next alert email at %s (in %s)", next.Format("02/01/2006 15:04"), sleepDuration.Round(time.Minute))
			time.Sleep(sleepDuration)

			// Gửi email
			if err := SendAlertEmail(); err != nil {
				log.Printf("[Scheduler] Failed to send alert email: %v", err)
			}
		}
	}()
}
