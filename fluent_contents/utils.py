"""
This module provides additional small utility functions which plugins can use.
"""
from django.core.exceptions import ValidationError
from django.utils.translation import ugettext_lazy as _
import re


def validate_html_size(value):
    """
    Validate whether a value can be used in a HTML ``width`` or ``height`` value.
    The value can either be a number, or end with a percentage sign.
    """
    if not re.match(r'^\d+%?$', value):
        raise ValidationError(_("Value should be a number or percentage."))
