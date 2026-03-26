package models

import "time"

type PriceHistory struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProductID uint      `json:"product_id" gorm:"not null;index"`
	Product   Product   `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	OldPrice  int       `json:"old_price" gorm:"not null"`
	NewPrice  int       `json:"new_price" gorm:"not null"`
	ChangedBy uint      `json:"changed_by" gorm:"not null"`
	User      User      `json:"user,omitempty" gorm:"foreignKey:ChangedBy"`
	CreatedAt time.Time `json:"created_at"`
}
