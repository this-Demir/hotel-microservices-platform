using Microsoft.Extensions.Configuration;
using Moq;
using NotificationService.Services;
using Resend;

namespace NotificationService.Tests;

public class EmailServiceTests
{
    private readonly Mock<IResend> _resend = new();
    private readonly Mock<IConfiguration> _config = new();

    private EmailService Build()
    {
        _config.Setup(c => c["Resend:FromEmail"]).Returns("noreply@test.com");
        return new EmailService(_resend.Object, _config.Object);
    }

    private void SetupResend()
    {
        _resend.Setup(r => r.EmailSendAsync(
                It.IsAny<EmailMessage>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResendResponse<Guid>(Guid.NewGuid(), new ResendRateLimit()));
    }

    // ── SendBookingConfirmationAsync ───────────────────────────────────────────

    [Fact]
    public async Task SendBookingConfirmation_CallsResendOnce()
    {
        SetupResend();
        await Build().SendBookingConfirmationAsync(
            "guest@hotel.com", "Grand Hotel", "Deluxe",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5), 450.00m);

        _resend.Verify(r => r.EmailSendAsync(
            It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendBookingConfirmation_SetsFrom_AndRecipient_AndSubject()
    {
        EmailMessage? captured = null;
        _resend.Setup(r => r.EmailSendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((msg, _) => captured = msg)
            .ReturnsAsync(new ResendResponse<Guid>(Guid.NewGuid(), new ResendRateLimit()));

        await Build().SendBookingConfirmationAsync(
            "guest@hotel.com", "Grand Hotel", "Deluxe",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5), 450.00m);

        Assert.NotNull(captured);
        Assert.Equal("noreply@test.com", captured.From);
        Assert.Contains("Grand Hotel", captured.Subject);
        Assert.Contains("guest@hotel.com", captured.To);
    }

    [Fact]
    public async Task SendBookingConfirmation_HtmlBody_ContainsPricePaid()
    {
        EmailMessage? captured = null;
        _resend.Setup(r => r.EmailSendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((msg, _) => captured = msg)
            .ReturnsAsync(new ResendResponse<Guid>(Guid.NewGuid(), new ResendRateLimit()));

        await Build().SendBookingConfirmationAsync(
            "guest@hotel.com", "Sea View", "Suite",
            new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 3), 750.00m);

        Assert.NotNull(captured?.HtmlBody);
        Assert.Contains("750", captured.HtmlBody);
        Assert.Contains("Sea View", captured.HtmlBody);
    }

    // ── SendCapacityAlertAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task SendCapacityAlert_CallsResendOnce()
    {
        SetupResend();
        await Build().SendCapacityAlertAsync("admin@hotel.com", "Mountain Lodge", 15.5);

        _resend.Verify(r => r.EmailSendAsync(
            It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendCapacityAlert_SetsFrom_AndRecipient_AndSubject()
    {
        EmailMessage? captured = null;
        _resend.Setup(r => r.EmailSendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((msg, _) => captured = msg)
            .ReturnsAsync(new ResendResponse<Guid>(Guid.NewGuid(), new ResendRateLimit()));

        await Build().SendCapacityAlertAsync("admin@hotel.com", "Mountain Lodge", 15.5);

        Assert.NotNull(captured);
        Assert.Equal("noreply@test.com", captured.From);
        Assert.Contains("Mountain Lodge", captured.Subject);
        Assert.Contains("admin@hotel.com", captured.To);
    }

    [Fact]
    public async Task SendCapacityAlert_HtmlBody_ContainsCapacityPercent()
    {
        EmailMessage? captured = null;
        _resend.Setup(r => r.EmailSendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((msg, _) => captured = msg)
            .ReturnsAsync(new ResendResponse<Guid>(Guid.NewGuid(), new ResendRateLimit()));

        await Build().SendCapacityAlertAsync("admin@hotel.com", "City Inn", 12.3);

        Assert.NotNull(captured?.HtmlBody);
        Assert.Contains("12", captured.HtmlBody); // 12.3%
        Assert.Contains("City Inn", captured.HtmlBody);
    }
}
