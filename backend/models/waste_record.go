package models

import "time"

type WasteRecord struct {
	ID        uint         `json:"id" gorm:"primaryKey"`
	ProductID uint         `json:"product_id" gorm:"not null"`
	Product   Product      `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	BatchID   uint         `json:"batch_id" gorm:"not null"`
	Batch     ProductBatch `json:"batch,omitempty" gorm:"foreignKey:BatchID"`
	Quantity  int          `json:"quantity" gorm:"not null"`
	Reason    string       `json:"reason" gorm:"size:50;not null"` // expired/damaged/lost/other
	UserID    uint         `json:"user_id" gorm:"not null"`
	User      User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Note      *string      `json:"note"`
	CreatedAt time.Time    `json:"created_at"`
}
