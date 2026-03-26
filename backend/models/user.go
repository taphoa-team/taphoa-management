package models

import "time"

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:100;not null"`
	Phone     string    `json:"phone" gorm:"size:20;uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"size:255;not null"` // json:"-" = không trả password ra API
	Role      string    `json:"role" gorm:"size:20;not null;default:staff"` // admin hoặc staff
	CreatedAt time.Time `json:"created_at"`
}
