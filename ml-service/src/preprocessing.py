"""
Text Preprocessing and Cleaning Utilities for SpendSense Expense Classification.
"""
import re
from typing import Optional


def clean_text(text: Optional[str]) -> str:
    """
    Cleans raw transaction descriptions and merchant strings.
    - Lowers case
    - Replaces transaction noise symbols (*, #, _, -, /) with spaces
    - Removes isolated digits/store ID numbers
    - Strips redundant whitespaces
    """
    if not text or not isinstance(text, str):
        return ""

    # Convert to lowercase
    text = text.lower()

    # Replace noise punctuation with space
    text = re.sub(r"[\*#\-_/:;,.\(\)\[\]\{\}\<\>|~]", " ", text)

    # Remove currency abbreviations and symbols
    text = re.sub(r"\b(inr|rs|usd|eur|gbp)\b", " ", text)

    # Remove isolated sequences of digits (transaction IDs, account numbers)
    text = re.sub(r"\b\d{3,}\b", " ", text)

    # Remove any stray non-alphanumeric characters (except whitespace)
    text = re.sub(r"[^a-z0-9\s]", " ", text)

    # Collapse multiple spaces into one
    text = re.sub(r"\s+", " ", text).strip()

    return text


def prepare_transaction_text(description: str, merchant: Optional[str] = None) -> str:
    """
    Combines merchant and description into an enriched text representation
    for the TF-IDF feature extractor.
    """
    clean_desc = clean_text(description)
    clean_merch = clean_text(merchant) if merchant else ""

    if clean_merch and clean_merch not in clean_desc:
        combined = f"{clean_merch} {clean_desc}"
    else:
        combined = clean_desc

    return combined.strip()
