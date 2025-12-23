"""
SMS Service using Twilio
Handles sending SMS campaigns and tracking delivery status
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException


class SMSService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.client = None
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
    
    def is_configured(self) -> bool:
        """Check if Twilio credentials are configured"""
        return bool(self.client and self.from_number)
    
    def send_sms(
        self,
        to_number: str,
        message: str,
        status_callback: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a single SMS message
        
        Args:
            to_number: Recipient phone number (E.164 format: +1XXXXXXXXXX)
            message: Message content
            status_callback: URL for delivery status webhook
            
        Returns:
            Dict with sid, status, error_code, error_message
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Twilio not configured. Add credentials in Settings."
            }
        
        try:
            # Format phone number if needed
            to_number = self._format_phone(to_number)
            
            kwargs = {
                "body": message,
                "from_": self.from_number,
                "to": to_number
            }
            
            if status_callback:
                kwargs["status_callback"] = status_callback
            
            msg = self.client.messages.create(**kwargs)
            
            return {
                "success": True,
                "sid": msg.sid,
                "status": msg.status,
                "to": to_number,
                "error_code": None,
                "error_message": None
            }
            
        except TwilioRestException as e:
            return {
                "success": False,
                "sid": None,
                "status": "failed",
                "to": to_number,
                "error_code": e.code,
                "error_message": str(e.msg)
            }
        except Exception as e:
            return {
                "success": False,
                "sid": None,
                "status": "failed",
                "to": to_number,
                "error_code": None,
                "error_message": str(e)
            }
    
    def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message_template: str,
        status_callback: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send SMS to multiple recipients with personalization
        
        Args:
            recipients: List of dicts with 'phone' and optionally 'name', 'patient_id'
            message_template: Message with placeholders like {name}
            status_callback: URL for delivery status webhook
            
        Returns:
            Dict with total, sent, failed, and details
        """
        results = {
            "total": len(recipients),
            "sent": 0,
            "failed": 0,
            "details": []
        }
        
        for recipient in recipients:
            # Personalize message
            message = message_template
            if "{name}" in message and recipient.get("name"):
                # Use first name only
                first_name = recipient["name"].split()[0] if recipient.get("name") else ""
                message = message.replace("{name}", first_name)
            
            # Remove any remaining placeholders
            message = message.replace("{name}", "there")
            
            result = self.send_sms(
                to_number=recipient["phone"],
                message=message,
                status_callback=status_callback
            )
            
            result["patient_id"] = recipient.get("patient_id")
            result["recipient_name"] = recipient.get("name")
            
            if result["success"]:
                results["sent"] += 1
            else:
                results["failed"] += 1
            
            results["details"].append(result)
        
        return results
    
    def _format_phone(self, phone: str) -> str:
        """Format phone number to E.164 format"""
        # Remove all non-digits
        digits = ''.join(filter(str.isdigit, phone))
        
        # Handle US numbers
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith("1"):
            return f"+{digits}"
        elif phone.startswith("+"):
            return phone
        else:
            return f"+{digits}"
    
    def get_message_status(self, message_sid: str) -> Dict[str, Any]:
        """Get current status of a sent message"""
        if not self.is_configured():
            return {"error": "Twilio not configured"}
        
        try:
            msg = self.client.messages(message_sid).fetch()
            return {
                "sid": msg.sid,
                "status": msg.status,
                "to": msg.to,
                "error_code": msg.error_code,
                "error_message": msg.error_message,
                "date_sent": msg.date_sent.isoformat() if msg.date_sent else None,
                "date_updated": msg.date_updated.isoformat() if msg.date_updated else None
            }
        except Exception as e:
            return {"error": str(e)}
    
    def validate_phone(self, phone: str) -> Dict[str, Any]:
        """Validate a phone number using Twilio Lookup"""
        if not self.is_configured():
            return {"valid": False, "error": "Twilio not configured"}
        
        try:
            formatted = self._format_phone(phone)
            lookup = self.client.lookups.v2.phone_numbers(formatted).fetch()
            return {
                "valid": lookup.valid,
                "phone_number": lookup.phone_number,
                "country_code": lookup.country_code,
                "carrier": lookup.carrier.get("name") if lookup.carrier else None
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}


# Singleton instance
sms_service = SMSService()
