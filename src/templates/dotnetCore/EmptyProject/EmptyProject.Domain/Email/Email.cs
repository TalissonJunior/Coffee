using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Net;
using System.Net.Mail;

namespace EmptyProject.Domain.Email
{
    public sealed class Email
    {
        public string UserNameCredentials { get; private set; }
        public string PasswordCredentials { get; private set; }
        public string FromEmail { get; private set; }
        public string Host { get; private set; }
        public int Port { get; private set; }
        public bool UseDefaultCredentials { get; private set; }
        public bool EnableSSL { get; private set; }
        public SmtpDeliveryMethod DeliveryMethod { get; private set; }

        public Email(
            string userNameCredentials,
            string passwordCredentials,
            string fromEmail,
            string host,
            int port = 587,
            bool useDefaultCredentials = false,
            bool enableSSL = false,
            SmtpDeliveryMethod deliveryMethod = SmtpDeliveryMethod.Network)
        {
            UserNameCredentials = userNameCredentials;
            PasswordCredentials = passwordCredentials;
            FromEmail = fromEmail;
            Host = host;
            Port = port;
            UseDefaultCredentials = useDefaultCredentials;
            EnableSSL = enableSSL;
            DeliveryMethod = deliveryMethod;
        }

        private void Send(MailMessage mailMessage)
        {
            using (SmtpClient client = new SmtpClient(Host)
            {
                EnableSsl = EnableSSL,
                Port = Port,
                DeliveryMethod = DeliveryMethod,
                UseDefaultCredentials = UseDefaultCredentials,
                Credentials = new NetworkCredential(
                UserNameCredentials,
                PasswordCredentials)
            })
            {
                client.Send(mailMessage);
            }
        }

        public void Send(List<string> to, string subject, string body)
        {
            try
            {
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(FromEmail)
                };

                to.ForEach((email) =>
                {
                    mailMessage.To.Add(email);
                });


                mailMessage.Subject = subject;
                mailMessage.Body = body;
                mailMessage.IsBodyHtml = true;

                Send(mailMessage);
            }
            catch (System.Exception)
            {
                throw;
            }
        }

        public void Send(
            List<string> to,
            string subject,
            string body,
            string attachmentName,
            byte[] attachment,
            string attachmentContentType)
        {
            try
            {
                using (var ms = new MemoryStream(attachment))
                {
                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(FromEmail)
                    };

                    to.ForEach((email) =>
                    {
                        mailMessage.To.Add(email);
                    });


                    mailMessage.Subject = subject;
                    mailMessage.Body = body;
                    mailMessage.IsBodyHtml = true;

                    using (var attach = new Attachment(ms, attachmentName, attachmentContentType))
                    {
                        mailMessage.Attachments.Add(attach);
                    }

                    Send(mailMessage);
                }
            }
            catch (System.Exception)
            {
                throw;
            }
        }

        public static string CreateEmailTemplate(
            string templateFilePath,
            IDictionary<string, string> keyValuesToReplace)
        {
            var template = File.ReadAllText(templateFilePath);

            foreach (string key in keyValuesToReplace.Keys)
            {
                string value;
                keyValuesToReplace.TryGetValue(key, out value);

                template = template.Replace(key, value);
            }

            return template;
        }

        public static bool IsValidEmail(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return false;
            }

            return new EmailAddressAttribute().IsValid(email);
        }
    }
}
