import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// Initialize Resend with API key
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY is not set in environment variables");
}

const resend = new Resend(apiKey);

export const sendResetCode = async (email, code) => {
  try {
    console.log('Attempting to send reset code to:', email);
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    console.log('Using from email:', fromEmail);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Your Password Reset Code',
      html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`
    });
    
    if (error) {
      console.error('Resend API error:', error);
      throw new Error(error.message || 'Failed to send email');
    }
    
    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error.message || error);
    throw error;
  }
};

export const sendSignupCode = async (email, code) => {
  try {
    console.log('Attempting to send signup code to:', email);
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    console.log('Using from email:', fromEmail);
    console.log('API Key present:', !!apiKey);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Your Signup Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Welcome to Funderr!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining Funderr. To complete your registration, please use the verification code below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #007bff; color: white; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 5px; display: inline-block; letter-spacing: 2px;">
                ${code}
              </div>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
              <strong>Important:</strong> This code will expire in 15 minutes for security reasons.
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If you didn't request this verification code, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated message from Funderr. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    });
    
    if (error) {
      console.error('Resend API error:', error);
      throw new Error(error.message || 'Failed to send email');
    }
    
    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error.message || error);
    throw error;
  }
};