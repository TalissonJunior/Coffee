using EmptyProject.WebApi.Configurations;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace EmptyProject.WebApi.Helpers
{
    public sealed class JwtHelper
    {
        private AppSettings appSettings;

        public JwtHelper(IOptions<AppSettings> appSettings)
        {
            this.appSettings = appSettings.Value;
        }

        public string GenerateToken(ClaimsIdentity subject,
            string secret = null, int tokenDuration = 0)
        {
            if (string.IsNullOrEmpty(secret))
            {
                secret = appSettings.JwtSettings.Secret;
            }

            if (tokenDuration <= 0)
            {
                tokenDuration = appSettings.JwtSettings.TokenDuration;
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(secret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = subject,
                Expires = DateTime.UtcNow.AddDays(tokenDuration),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature),
                Issuer = appSettings.JwtSettings.Issuer,
                Audience = appSettings.JwtSettings.Audience
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return tokenString;
        }

        public string GenerateForgetPasswordToken(int user_id)
        {
            // Define const Key this should be private secret key  stored in some safe place
            // var secret = Encoding.ASCII.GetString(user.password_hash) + Encoding.ASCII.GetString(user.password_salt);
            var key = Encoding.ASCII.GetBytes(appSettings.JwtSettings.Secret);

            // Create Security key  using private key above:
            // not that latest version of JWT using Microsoft namespace instead of System
            var securityKey = new SymmetricSecurityKey(key);

            // Also note that securityKey length should be >256b
            // so you have to make sure that your private key has a proper length
            //
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);


            var claims = new[]
            {
                 new Claim(JwtRegisteredClaimNames.Sub, user_id.ToString()),
                 new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                 new Claim(JwtRegisteredClaimNames.Iat, ToUnixEpochDate(DateTime.UtcNow).ToString(), ClaimValueTypes.Integer64),
             };

            //
            var jwt = new JwtSecurityToken(
                appSettings.JwtSettings.Issuer,
                appSettings.JwtSettings.Audience,
                claims,
                DateTime.UtcNow,
                DateTime.UtcNow.Add(TimeSpan.FromMinutes(appSettings.JwtSettings.PasswordResetTokenDutation)),
                credentials);

            var handler = new JwtSecurityTokenHandler();
            var tokenString = handler.WriteToken(jwt);

            return tokenString;
        }


        public int ConsumeForgetPasswordToken(string token)
        {
            var handler = new JwtSecurityTokenHandler();

            // var secret = Encoding.ASCII.GetString(user.password_hash) + Encoding.ASCII.GetString(user.password_salt);
            var signingKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(appSettings.JwtSettings.Secret));

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = appSettings.JwtSettings.Issuer,

                ValidateAudience = true,
                ValidAudience = appSettings.JwtSettings.Audience,

                ValidateIssuerSigningKey = true,
                IssuerSigningKey = signingKey,

                RequireExpirationTime = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            if (!handler.CanReadToken(token))
                throw new ArgumentException("Invalid token");

            try
            {
                handler.ValidateToken(token, tokenValidationParameters, out var validatedToken);

                if (!(validatedToken is JwtSecurityToken jwtSecurityToken) || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                    throw new SecurityTokenException("Invalid token");

                var id = jwtSecurityToken.Subject;

                return int.Parse(id);
            }
            catch (SecurityTokenExpiredException)
            {
                throw new ArgumentException("Expired token.");
            }
            catch (Exception)
            {
                throw new ArgumentException("Invalid token");
            }
        }

        private static long ToUnixEpochDate(DateTime date)
            => (long)Math.Round((date.ToUniversalTime() -
                                new DateTimeOffset(1970, 1, 1, 0, 0, 0, TimeSpan.Zero))
                                .TotalSeconds);


    }
}
