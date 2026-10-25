"""
Configuration and Taxonomy Constants for SpendSense ML Service.
Strictly synchronized with backend/prisma/schema.prisma and docs/api-specification.md.
"""
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
SYNTHETIC_DATA_DIR = DATA_DIR / "synthetic"
MODELS_DIR = BASE_DIR / "models"

# Ensure directories exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, SYNTHETIC_DATA_DIR, MODELS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# 10 Category Taxonomy - Single Source of Truth
CATEGORIES = [
    {"id": 1, "name": "Food & Dining"},
    {"id": 2, "name": "Groceries"},
    {"id": 3, "name": "Transport"},
    {"id": 4, "name": "Shopping"},
    {"id": 5, "name": "Bills & Utilities"},
    {"id": 6, "name": "Entertainment"},
    {"id": 7, "name": "Healthcare"},
    {"id": 8, "name": "Education"},
    {"id": 9, "name": "Travel"},
    {"id": 10, "name": "Other"},
]

CATEGORY_ID_TO_NAME = {item["id"]: item["name"] for item in CATEGORIES}
CATEGORY_NAME_TO_ID = {item["name"]: item["id"] for item in CATEGORIES}
CATEGORY_NAMES = [item["name"] for item in CATEGORIES]

# Model Artifact Paths
CLASSIFIER_MODEL_PATH = MODELS_DIR / "classifier_v1.joblib"
KMEANS_MODEL_PATH = MODELS_DIR / "kmeans_v1.joblib"
CLASSIFIER_METADATA_PATH = MODELS_DIR / "classifier_metadata.json"
KMEANS_METADATA_PATH = MODELS_DIR / "kmeans_metadata.json"

# Merchant and Keyword Seeds for Synthetic Generation
CATEGORY_SEEDS = {
    "Food & Dining": {
        "merchants": [
            "Starbucks", "McDonalds", "Dominos Pizza", "Subway", "Chipotle",
            "Swiggy", "Zomato", "Burger King", "Dunkin Donuts", "KFC",
            "Pizza Hut", "Blue Tokai Coffee", "Haldiram", "Barbeque Nation", "Local Cafe"
        ],
        "templates": [
            "{merchant} #{digits} Coffee & Breakfast",
            "{merchant} Online Order ID-{digits}",
            "{merchant} Dinner Dine-In",
            "{merchant} Food Delivery",
            "Lunch with friends at {merchant}",
            "{merchant} Takeout Meal",
            "Payment to {merchant}"
        ],
        "amount_range": (80.0, 2500.0),
        "mean_amount": 420.0
    },
    "Groceries": {
        "merchants": [
            "Blinkit", "Zepto", "Instamart", "Walmart", "Costco",
            "Reliance Fresh", "BigBasket", "Whole Foods", "Trader Joes",
            "DMart", "Safeway", "Nature's Basket", "Local Vegetable Market", "Daily Milk Dairy"
        ],
        "templates": [
            "{merchant} Weekly Supermarket Grocery",
            "{merchant} Milk, Vegetables & Eggs",
            "{merchant} Order Ref-{digits}",
            "Store purchase {merchant} Pos-{digits}",
            "{merchant} Fresh Produce",
            "{merchant} Household Essentials"
        ],
        "amount_range": (150.0, 7500.0),
        "mean_amount": 1850.0
    },
    "Transport": {
        "merchants": [
            "Uber", "Ola Cabs", "Lyft", "Shell Petrol Pump", "HP Petrol Station",
            "Indian Oil Fuel", "City Metro Transit", "Fastag Toll Plaza", "Rapido Bike",
            "Airport Taxi Service", "Downtown Parking Meter", "Auto Rickshaw Fare"
        ],
        "templates": [
            "{merchant} *TRIP {digits}",
            "{merchant} Ride to Office",
            "{merchant} Fuel Petrol Refill",
            "{merchant} Electronic Toll Debit",
            "{merchant} Metro Smart Card Recharge",
            "{merchant} Fare Payment",
            "Parking Fee at {merchant}"
        ],
        "amount_range": (40.0, 3500.0),
        "mean_amount": 480.0
    },
    "Shopping": {
        "merchants": [
            "Amazon", "Flipkart", "Myntra", "Zara", "H&M",
            "Nike Store", "Apple Store", "Uniqlo", "IKEA",
            "Target", "Best Buy", "Sephora", "Decathlon", "Levi's Store"
        ],
        "templates": [
            "{merchant} Retail Purchase Pos-{digits}",
            "{merchant} Online Order Item-{digits}",
            "{merchant} Clothing & Apparel",
            "{merchant} Electronics Gadgets",
            "{merchant} Home Decor & Furniture",
            "Purchase at {merchant}"
        ],
        "amount_range": (350.0, 18000.0),
        "mean_amount": 2600.0
    },
    "Bills & Utilities": {
        "merchants": [
            "State Electricity Board", "City Water Authority", "Airtel Broadband",
            "Jio Fiber Internet", "Indane Cooking Gas", "Tata Power",
            "Apartment Maintenance HOA", "Mobile Postpaid Bill", "Mahanagar Gas"
        ],
        "templates": [
            "{merchant} Monthly Bill Pay Cons-{digits}",
            "{merchant} Highspeed Internet Recharge",
            "{merchant} Electricity Consumption Bill",
            "{merchant} Water Utility Payment",
            "{merchant} Gas Pipeline Bill",
            "{merchant} Maintenance Due"
        ],
        "amount_range": (400.0, 12000.0),
        "mean_amount": 2200.0
    },
    "Entertainment": {
        "merchants": [
            "Netflix", "Spotify", "Amazon Prime", "BookMyShow", "PVR Cinemas",
            "INOX Multiplex", "Steam Games", "Sony PlayStation Store", "Disney+ Hotstar",
            "YouTube Premium", "Live Concert Ticket", "Gaming Arcade"
        ],
        "templates": [
            "{merchant} Monthly Subscription",
            "{merchant} Movie Tickets for 2 Pos-{digits}",
            "{merchant} Annual Streaming Plan",
            "{merchant} Digital Game Purchase",
            "{merchant} Music Subscription Payment",
            "Weekend Show at {merchant}"
        ],
        "amount_range": (149.0, 4500.0),
        "mean_amount": 650.0
    },
    "Healthcare": {
        "merchants": [
            "Apollo Pharmacy", "MedPlus Chemist", "Fortis Hospital", "1mg Online Chemist",
            "Dr Lal PathLabs", "Max Healthcare", "Dental Care Clinic", "Vision Optical Center",
            "Guardian Pharmacy", "Physiotherapy Clinic"
        ],
        "templates": [
            "{merchant} Prescription Medicines Invoice-{digits}",
            "{merchant} Doctor Consultation Fee",
            "{merchant} Blood Test & Diagnostics",
            "{merchant} Dental Cleaning & Care",
            "{merchant} Vitamin Supplements & Health Care",
            "Hospital Outpatient Fee {merchant}"
        ],
        "amount_range": (120.0, 15000.0),
        "mean_amount": 1450.0
    },
    "Education": {
        "merchants": [
            "Udemy", "Coursera", "Harvard Online", "College Tuition Office",
            "Oxford University Press", "Chegg Study", "EdX Learning", "Local Bookstore",
            "GRE / TOEFL Exam Fee", "Skillshare"
        ],
        "templates": [
            "{merchant} Python & Machine Learning Course",
            "{merchant} Semester Exam Registration",
            "{merchant} Textbook & Study Material",
            "{merchant} Professional Certification Fee",
            "{merchant} Online Tutorial Subscription",
            "Tuition Fee Installment {merchant}"
        ],
        "amount_range": (399.0, 25000.0),
        "mean_amount": 2400.0
    },
    "Travel": {
        "merchants": [
            "MakeMyTrip", "Booking.com", "Airbnb", "IndiGo Airlines", "Air India",
            "IRCTC Train Ticket", "Expedia", "Agoda Hotels", "Marriott Resort",
            "Uber Intercity"
        ],
        "templates": [
            "{merchant} Roundtrip Flight Booking PNR-{digits}",
            "{merchant} Hotel 3-Night Stay Booking",
            "{merchant} Train Reservation Confirmed",
            "{merchant} Weekend Resort Villa Getaway",
            "{merchant} Vacation Package",
            "Travel Booking through {merchant}"
        ],
        "amount_range": (600.0, 35000.0),
        "mean_amount": 6200.0
    },
    "Other": {
        "merchants": [
            "ATM Cash Withdrawal", "Bank Convenience Fee", "Postal Courier Service",
            "Dry Cleaning Laundry", "Pet Supplies Store", "Hardware Tool Shop",
            "Government Registry Office", "General Miscellaneous Store"
        ],
        "templates": [
            "{merchant} ATM TXN-{digits}",
            "{merchant} Service Charge Debit",
            "{merchant} Laundry Service Pos-{digits}",
            "{merchant} Hardware Store Tools",
            "{merchant} Miscellaneous Expense",
            "Direct Payment {merchant}"
        ],
        "amount_range": (50.0, 5000.0),
        "mean_amount": 750.0
    }
}
