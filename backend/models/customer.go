package models

import "time"

type Customer struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:100;not null"`
	Phone     *string   `json:"phone" gorm:"size:20"`
	Address   *string   `json:"address" gorm:"size:200"`
	TotalDebt int       `json:"total_debt" gorm:"default:0"` // cache tổng nợ
	CreatedAt time.Time `json:"created_at"`
}
