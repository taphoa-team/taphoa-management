package models

import "time"

type Debt struct {
	ID         uint     `json:"id" gorm:"primaryKey"`
	CustomerID uint     `json:"customer_id" gorm:"not null;index"`
	Customer   Customer `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	InvoiceID  *uint    `json:"invoice_id"`                              // NULL nếu trả nợ
	Invoice    *Invoice `json:"invoice,omitempty" gorm:"foreignKey:InvoiceID"`
	Type       string   `json:"type" gorm:"size:20;not null"`            // debt / payment
	Amount     int      `json:"amount" gorm:"not null"`
	Note       *string  `json:"note"`
	CreatedAt  time.Time `json:"created_at"`
}
