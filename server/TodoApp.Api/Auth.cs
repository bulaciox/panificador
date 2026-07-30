using System.Security.Cryptography;
using System.Text;

namespace TodoApp.Api;

/// <summary>
/// Candado de un solo usuario: una contraseña en la variable APP_PASSWORD y una cookie derivada
/// de ella. Sin sesiones que guardar, así que sobrevive a reinicios y despliegues.
/// Si APP_PASSWORD está vacía no hay candado, que es lo que interesa en desarrollo.
/// </summary>
public static class Auth
{
    public const string CookieName = "pan_auth";

    private static readonly byte[] Salt = Encoding.UTF8.GetBytes("panificador-auth-v1");

    public static string? Password(IConfiguration configuration)
    {
        var value = configuration["APP_PASSWORD"];
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    /// <summary>Valor de la cookie: la contraseña nunca viaja ni se guarda en claro.</summary>
    public static string Token(string password) =>
        Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(password), Salt))
            .ToLowerInvariant();

    public static bool IsAuthenticated(HttpContext context, string password) =>
        context.Request.Cookies.TryGetValue(CookieName, out var cookie) &&
        cookie is not null &&
        Matches(cookie, Token(password));

    public static void SignIn(HttpContext context, string password, bool secure)
    {
        context.Response.Cookies.Append(CookieName, Token(password), new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromDays(365),
            Path = "/"
        });
    }

    public static void SignOut(HttpContext context) =>
        context.Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });

    /// <summary>Comparación en tiempo constante, para no filtrar nada por el tiempo de respuesta.</summary>
    public static bool Matches(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(a),
            Encoding.UTF8.GetBytes(b));
}
