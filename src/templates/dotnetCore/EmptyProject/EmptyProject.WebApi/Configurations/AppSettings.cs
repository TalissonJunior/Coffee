namespace EmptyProject.WebApi.Configurations
{
    public class AppSettings
    {
        public JwtSettings JwtSettings { get; set; }
        public Logging Logging { get; set; }
        public App App { get; set; }
        public Uploads Uploads { get; set; }
        public Emailsettings Emailsettings { get; set; }
        public Client Client { get; set; }
    }

    public class JwtSettings
    {
        public string Secret { get; set; }
        public int TokenDuration { get; set; }
        public string Issuer { get; set; }
        public string Audience { get; set; }
        public int PasswordResetTokenDutation { get; set; }
    }

    public class Logging
    {
        public bool IncludeScopes { get; set; }
        public Debug Debug { get; set; }
        public Console Console { get; set; }
    }

    public class Debug
    {
        public Loglevel LogLevel { get; set; }
    }

    public class Loglevel
    {
        public string Default { get; set; }
    }

    public class Console
    {
        public Loglevel1 LogLevel { get; set; }
    }

    public class Loglevel1
    {
        public string Default { get; set; }
    }

    public class App
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Version { get; set; }
        public string TermsOfService { get; set; }
    }

    public class Uploads
    {
        public string BaseUrl { get; set; }
        public string Images { get; set; }
        public string ImagesOutputUrl { get; set; }

    }

    public class Emailsettings
    {
        public string Host { get; set; }
        public int Port { get; set; }
        public bool IsSSL { get; set; }
        public string Email { get; set; }
        public string UserName { get; set; }
        public string Password { get; set; }
        public Emailtemplate[] EmailTemplates { get; set; }
    }

    public class Emailtemplate
    {
        public string Name { get; set; }
        public string Html { get; set; }
    }

    public class Client
    {
        public string ServerURL { get; set; }
    }

}
