/**
 * User Policy Controller
 * Handles Terms & Conditions and Privacy Policy for Users
 */

const TERMS_CONTENT = `
Terms & Conditions for Users

1. Acceptance of Terms
By creating an account or using this platform, you agree to comply with these Terms & Conditions and all applicable laws.

2. Eligibility
Users must be at least 18 years old or use the platform under parental/legal guardian supervision.

3. User Account
You are responsible for maintaining the confidentiality of your account credentials and activities performed through your account.

4. Wallet Recharge & Payments
- Users can add money to their wallet using available payment methods.
- Once wallet recharge is completed successfully, the amount is NON-REFUNDABLE.
- Wallet balance cannot be transferred to bank accounts or other users unless explicitly allowed by the platform.
- Failed transactions may be refunded automatically by the payment provider as per their policies.

5. Consultation Services
The platform provides astrology consultation services through independent astrologers. The platform does not guarantee the accuracy of predictions, remedies, or advice.

6. Prohibited Activities
Users must not:
- Abuse, threaten, harass, or insult astrologers or support staff.
- Share personal contact information such as phone numbers, WhatsApp numbers, email addresses, or social media handles during consultations.
- Attempt to take consultations outside the platform.
- Record, copy, or distribute calls, chats, or content without permission.
- Use fake identities or fraudulent payment methods.

7. Platform Communication Policy
All consultations, chats, calls, and payments must remain within the platform for security and quality purposes.

8. Refund Policy
- Wallet recharges are strictly non-refundable.
- Consultation charges deducted for completed services are non-refundable.
- Refunds may only be considered in genuine technical failure cases verified by the platform.

9. Service Availability
The platform may temporarily suspend or limit services due to maintenance, technical issues, or policy violations.

10. Suspension & Termination
We reserve the right to suspend or permanently ban user accounts involved in suspicious, abusive, fraudulent, or policy-violating activities.

11. Intellectual Property
All platform content including logos, designs, software, and materials are owned by the company and protected by law.

12. Limitation of Liability
The platform is not responsible for decisions, losses, emotional distress, or damages resulting from astrology consultations or remedies.

13. Modification of Terms
We reserve the right to modify these Terms & Conditions at any time. Continued use of the platform after updates means acceptance of revised terms.
`;

const PRIVACY_CONTENT = `
Privacy Policy for Users

1. Information We Collect
We may collect:
- Full name
- Mobile number
- Email address
- Date of birth
- Gender
- Profile photo
- Payment and transaction details
- Device and app usage information
- Chat and call records for quality and safety purposes

2. Purpose of Data Collection
Your information is collected to:
- Create and manage your account
- Process wallet payments and transactions
- Provide astrology consultation services
- Improve app performance and user experience
- Prevent fraud and misuse
- Comply with legal obligations

3. Consultation Privacy
Chats and calls with astrologers may be monitored or recorded for quality assurance, dispute resolution, fraud prevention, and training purposes.

4. Payment Security
Payments are processed using secure third-party payment gateways. We do not store sensitive card or banking information directly on our servers.

5. Data Security
We use reasonable technical and administrative security measures to protect your personal information against unauthorized access or misuse.

6. Sharing of Information
We do not sell user data. Information may only be shared:
- With payment providers for transaction processing
- With legal authorities if required by law
- With service providers working on behalf of the platform

7. Cookies & Analytics
The app may use cookies, device identifiers, and analytics tools to improve functionality and user experience.

8. User Responsibilities
Users are responsible for maintaining the confidentiality of account credentials and ensuring secure use of the platform.

9. Data Retention
We may retain user data, transaction history, and communication records for legal, security, compliance, and operational purposes.

10. Third-Party Services
The platform may integrate third-party tools and services such as payment gateways, analytics providers, and communication systems. Their privacy policies may also apply.

11. Children's Privacy
The platform is not intended for users below 18 years of age without guardian supervision.

12. Policy Updates
This Privacy Policy may be updated periodically. Continued use of the platform after updates means acceptance of the revised policy.

13. Contact Us
For privacy concerns, complaints, or support issues, please contact our support team.
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