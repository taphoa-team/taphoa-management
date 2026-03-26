package models

type Category struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name" gorm:"size:100;uniqueIndex;not null"`
}
