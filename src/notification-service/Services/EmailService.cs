using Resend;

namespace NotificationService.Services;

public class EmailService(IResend resend, IConfiguration config) : IEmailService
{
    private readonly string _fromEmail = config["Resend:FromEmail"] ?? "no-reply@example.com";

    public async Task SendBookingConfirmationAsync(
        string toEmail,
        string hotelName,
        string roomType,
        DateOnly checkIn,
        DateOnly checkOut,
        decimal pricePaid)
    {
        var nights = checkOut.DayNumber - checkIn.DayNumber;
        var message = new EmailMessage
        {
            From = _fromEmail,
            Subject = $"Booking Confirmed — {hotelName}",
            HtmlBody = $"""
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
                    <tr><td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                        <!-- Header -->
                        <tr><td style="background:linear-gradient(135deg,#4f46e5,#6366f1);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
                          <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">StayEase</div>
                          <div style="margin-top:6px;font-size:13px;color:#c7d2fe;letter-spacing:1px;text-transform:uppercase;">Booking Confirmation</div>
                        </td></tr>

                        <!-- Body -->
                        <tr><td style="background:#fff;padding:40px;">

                          <!-- Success badge -->
                          <div style="text-align:center;margin-bottom:28px;">
                            <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✓</div>
                            <div style="margin-top:14px;font-size:22px;font-weight:700;color:#0f172a;">Your stay is confirmed!</div>
                            <div style="margin-top:6px;font-size:14px;color:#64748b;">We can't wait to welcome you.</div>
                          </div>

                          <!-- Booking card -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:24px;">
                            <tr><td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                              <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Property</div>
                              <div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:4px;">{hotelName}</div>
                              <div style="font-size:13px;color:#64748b;margin-top:2px;">{roomType}</div>
                            </td></tr>
                            <tr><td style="padding:0;">
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td width="50%" style="padding:18px 24px;border-right:1px solid #e2e8f0;">
                                    <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Check-in</div>
                                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px;">{checkIn:MMM dd, yyyy}</div>
                                    <div style="font-size:12px;color:#64748b;">From 14:00</div>
                                  </td>
                                  <td width="50%" style="padding:18px 24px;">
                                    <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Check-out</div>
                                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px;">{checkOut:MMM dd, yyyy}</div>
                                    <div style="font-size:12px;color:#64748b;">Until 11:00</div>
                                  </td>
                                </tr>
                              </table>
                            </td></tr>
                          </table>

                          <!-- Price summary -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                            <tr>
                              <td style="font-size:14px;color:#64748b;padding:6px 0;">{nights} night{(nights == 1 ? "" : "s")}</td>
                              <td align="right" style="font-size:14px;color:#64748b;padding:6px 0;">${pricePaid:F2}</td>
                            </tr>
                            <tr><td colspan="2" style="border-top:2px solid #0f172a;padding-top:10px;"></td></tr>
                            <tr>
                              <td style="font-size:16px;font-weight:700;color:#0f172a;padding-top:6px;">Total paid</td>
                              <td align="right" style="font-size:20px;font-weight:800;color:#4f46e5;padding-top:6px;">${pricePaid:F2}</td>
                            </tr>
                          </table>

                          <div style="font-size:13px;color:#94a3b8;text-align:center;">Questions? Reply to this email and we'll be happy to help.</div>
                        </td></tr>

                        <!-- Footer -->
                        <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                          <div style="font-size:12px;color:#94a3b8;">© 2026 StayEase · All rights reserved</div>
                        </td></tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """,
        };
        message.To.Add(toEmail);
        await resend.EmailSendAsync(message);
    }

    public async Task SendCapacityAlertAsync(
        string adminEmail,
        string hotelName,
        double capacityPercent)
    {
        var message = new EmailMessage
        {
            From = _fromEmail,
            Subject = $"Low Capacity Alert — {hotelName}",
            HtmlBody = BuildCapacityAlertHtml(hotelName, capacityPercent),
        };
        message.To.Add(adminEmail);
        await resend.EmailSendAsync(message);
    }

    private static string BuildCapacityAlertHtml(string hotelName, double capacityPercent)
    {
        var barWidth = (int)Math.Round(100 - capacityPercent);
        return $"""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                    <!-- Header -->
                    <tr><td style="background:linear-gradient(135deg,#b45309,#d97706);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
                      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">StayEase Admin</div>
                      <div style="margin-top:6px;font-size:13px;color:#fde68a;letter-spacing:1px;text-transform:uppercase;">⚠ Capacity Alert</div>
                    </td></tr>

                    <!-- Body -->
                    <tr><td style="background:#fff;padding:40px;">

                      <!-- Alert badge -->
                      <div style="text-align:center;margin-bottom:28px;">
                        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">⚠</div>
                        <div style="margin-top:14px;font-size:22px;font-weight:700;color:#0f172a;">Low Availability Detected</div>
                        <div style="margin-top:6px;font-size:14px;color:#64748b;">Action may be required for next month.</div>
                      </div>

                      <!-- Hotel card -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:12px;border:1px solid #fcd34d;overflow:hidden;margin-bottom:24px;">
                        <tr><td style="padding:20px 24px;border-bottom:1px solid #fde68a;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#92400e;">Property</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:4px;">{hotelName}</div>
                        </td></tr>
                        <tr><td style="padding:20px 24px;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#92400e;margin-bottom:10px;">Remaining Capacity — Next Month</div>
                          <!-- Progress bar -->
                          <div style="background:#e5e7eb;border-radius:99px;height:12px;overflow:hidden;margin-bottom:8px;">
                            <div style="background:{(capacityPercent < 15 ? "#dc2626" : "#f59e0b")};height:12px;width:{barWidth}%;border-radius:99px;"></div>
                          </div>
                          <div style="font-size:28px;font-weight:800;color:{(capacityPercent < 15 ? "#dc2626" : "#d97706")};margin-top:4px;">{capacityPercent:F1}% remaining</div>
                        </td></tr>
                      </table>

                      <!-- CTA -->
                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="https://hotel-admin-client.vercel.app" style="display:inline-block;background:#b45309;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:99px;text-decoration:none;">Open Admin Panel →</a>
                      </div>

                      <div style="font-size:13px;color:#94a3b8;text-align:center;">This alert was generated automatically by the StayEase nightly capacity checker.</div>
                    </td></tr>

                    <!-- Footer -->
                    <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                      <div style="font-size:12px;color:#94a3b8;">© 2026 StayEase · All rights reserved</div>
                    </td></tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
    }
}
