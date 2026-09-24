/**
 * Policy Controller
 * Handles Terms & Conditions and Privacy Policy
 */

const TERMS_CONTENT = `
Terms & Conditions for Astrologers

1. Acceptance of Terms
By registering as an astrologer on this platform, you agree to comply with these Terms & Conditions, platform policies, and applicable laws.

2. Eligibility
You must be at least 18 years old and legally capable of providing astrology consultation services.

3. Account Registration
You must provide accurate, complete, and updated information including your name, experience, bank details, and other required documents.

4. Professional Conduct
Astrologers must behave professionally, respectfully, and ethically with all users.

5. Prohibited Activities
Astrologers are strictly prohibited from:
- Sharing personal mobile numbers, WhatsApp numbers, Telegram IDs, email addresses, social media handles, or external contact details with users.
- Sharing residential or office addresses.
- Asking users to make payments outside the platform.
- Promoting external websites, apps, or businesses.
- Misleading, abusing, threatening, or harassing users.
- Providing illegal, fraudulent, or harmful advice.

6. Platform Communication Policy
All consultations and communications must remain within the platform. Attempting to move conversations outside the platform is strictly prohibited.

7. Penalties & Suspension
Violation of platform policies may result in:
- Warning notice
- Temporary suspension
- Permanent account ban
- Wallet balance hold or deduction in severe cases

8. Earnings & Payments
Astrologers will receive payouts based on completed consultations and platform payout schedules. Applicable taxes including TDS may be deducted as per law.

9. Ratings & Reviews
Users may rate and review astrologers. The platform reserves the right to remove fake or abusive reviews.

10. Content Responsibility
Astrologers are solely responsible for the advice, remedies, and predictions provided during consultations.

11. Intellectual Property
All platform content, branding, logos, and software belong to the company and may not be copied or reused without permission.

12. Confidentiality
Astrologers must keep all user information and consultation details confidential.

13. Termination
The platform reserves the right to suspend or terminate any astrologer account without prior notice for policy violations or suspicious activities.

14. Limitation of Liability
The platform is not responsible for any direct or indirect loss arising from astrology consultations provided by astrologers.

15. Modification of Terms
We reserve the right to modify these Terms & Conditions at any time. Continued usage of the platform means acceptance of updated terms.
`;

const PRIVACY_CONTENT = `
Privacy Policy for Astrologers

1. Information We Collect
We may collect:
- Full name
- Profile photo
- Mobile number
- Email address
- Bank account details
- PAN/Aadhaar details (if required)
- Experience and specialization details
- Device and usage information

2. Purpose of Data Collection
Your information is collected to:
- Create and manage astrologer accounts
- Process payouts
- Verify identity
- Improve platform services
- Ensure platform safety and compliance

3. Confidentiality of User Data
Astrologers must not misuse, copy, store, or share any user information obtained during consultations.

4. Communication Monitoring
Chats, calls, and platform activities may be monitored or recorded for quality control, safety, training, and fraud prevention purposes.

5. Payment Information
Bank and payment details are securely processed for payout purposes. Sensitive financial data is protected using industry-standard security measures.

6. Data Security
We implement reasonable technical and administrative security measures to protect your information from unauthorized access, misuse, or disclosure.

7. Sharing of Information
We do not sell personal information. Data may be shared only:
- To comply with legal obligations
- With payment partners for payouts
- With government authorities if required by law

8. Account Suspension & Data Retention
If your account is suspended or terminated, we may retain certain information for legal, compliance, fraud prevention, or accounting purposes.

9. Cookies & Analytics
The platform may use cookies, analytics tools, and tracking technologies to improve user experience and platform performance.

10. Third-Party Services
The platform may use third-party payment gateways, analytics providers, or communication services. Their policies may also apply.

11. Your Responsibilities
You are responsible for keeping your login credentials secure and maintaining confidentiality of your account access.

12. Policy Updates
This Privacy Policy may be updated periodically. Continued use of the platform after updates means you accept the revised policy.

13. Contact Us
For policy-related concerns, disputes, or privacy issues, please contact the platform support team.
`;

/**
 * GET /terms
 */
export const getTerms = (req, res) => {
  return res.status(200).json({
    success: true,
    type: "terms",
    content: TERMS_CONTENT,
    version: "1.0",
    updatedAt: new Date().toISOString(),
  });
};

/**
 * GET /privacy
 */
export const getPrivacy = (req, res) => {
  return res.status(200).json({
    success: true,
    type: "privacy",
    content: PRIVACY_CONTENT,
    version: "1.0",
    updatedAt: new Date().toISOString(),
  });
};