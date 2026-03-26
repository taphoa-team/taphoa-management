package models

import "time"

type Supplier struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:200;not null"`
	Phone     *string   `json:"phone" gorm:"size:20"`
	Address   *string   `json:"address" gorm:"size:300"`
	Note      *string   `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}
