package services

import (
	"context"
	"log"
	"os"
	"time"
)

// StartAlertScheduler chạy goroutine gửi email cảnh báo mỗi ngày lúc 7:00 sáng (VN time)
// Chỉ chạy khi SMTP_EMAIL đã được cấu hình
// Trả về cancel func để dừng goroutine khi shutdown
func StartAlertScheduler(ctx context.Context) {
	if os.Getenv("SMTP_EMAIL") == "" {
		log.Println("[Scheduler] SMTP_EMAIL not set, email alerts disabled")
		return
	}

	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		log.Printf("[Scheduler] Failed to load timezone, falling back to local: %v", err)
		loc = time.Now().Location()
	}

	go func() {
		for {
			now := time.Now().In(loc)

			// Tính thời điểm 7:00 sáng ngày tiếp theo
			next := time.Date(now.Year(), now.Month(), now.Day(), 7, 0, 0, 0, loc)
			if now.After(next) {
				next = next.AddDate(0, 0, 1)
			}

			sleepDuration := next.Sub(now)
			log.Printf("[Scheduler] Next alert email at %s (in %s)", next.Format("02/01/2006 15:04"), sleepDuration.Round(time.Minute))

			select {
			case <-ctx.Done():
				log.Println("[Scheduler] Shutting down")
				return
			case <-time.After(sleepDuration):
				// Gửi email
				if err := SendAlertEmail(); err != nil {
					log.Printf("[Scheduler] Failed to send alert email: %v", err)
				}
			}
		}
	}()
}
