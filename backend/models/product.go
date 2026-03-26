package models

import "time"

type Product struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	SKU         string    `json:"sku" gorm:"size:20;uniqueIndex;not null"`
	Barcode     *string   `json:"barcode" gorm:"size:50;uniqueIndex"` // pointer = nullable
	Name        string    `json:"name" gorm:"size:200;not null"`
	CategoryID  uint      `json:"category_id" gorm:"not null"`
	Category    Category  `json:"category" gorm:"foreignKey:CategoryID"`
	SellPrice   int       `json:"sell_price" gorm:"not null"`
	MinQuantity int       `json:"min_quantity" gorm:"default:5"`
	HasExpiry   bool      `json:"has_expiry" gorm:"default:false"`
	Unit        string    `json:"unit" gorm:"size:20;not null"` // chai, gói, cái...
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Quan hệ
	Batches         []ProductBatch  `json:"batches,omitempty" gorm:"foreignKey:ProductID"`
	UnitConversions []UnitConversion `json:"unit_conversions,omitempty" gorm:"foreignKey:ProductID"`
}
