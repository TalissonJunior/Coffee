using Autofac;
using EmptyProject.WebApi.Filters;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.IO;
using Autofac.Configuration;
using EmptyProject.WebApi.Configurations;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Swashbuckle.AspNetCore.Swagger;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Http;
using Sieve.Services;
using EmptyProject.Application.Outputs;
using EmptyProject.WebApi.Constants;

namespace EmptyProject.WebApi
{
    public class Startup
    {
        public IConfiguration Configuration { get; }
        private readonly AppSettings appSettings;

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;

            var appSettingsSection = Configuration.GetSection(nameof(AppSettings));
            appSettings = appSettingsSection.Get<AppSettings>();
        }

        public void ConfigureServices(IServiceCollection services)
        {
            var appSettingsSection = Configuration.GetSection(nameof(AppSettings));
            services.Configure<AppSettings>(appSettingsSection);

            var key = Encoding.ASCII.GetBytes(appSettings.JwtSettings.Secret);

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(x =>
            {
                x.RequireHttpsMetadata = false;
                x.SaveToken = true;
                x.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidAudience = appSettings.JwtSettings.Audience,
                    ValidIssuer = appSettings.JwtSettings.Issuer,
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(0)
                };

                x.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        Func<Task> callback = async () =>
                        {
                            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                            {
                                context.Response.Headers.Add("Token-Expired", "true");
                                context.Response.Headers.Add("Access-Control-Expose-Headers", "Token-Expired");
                            }
                            else if (context.Exception.GetType() == typeof(SecurityTokenException))
                            {
                                context.Response.StatusCode = 400;
                                var error = new ErrorOutput(ErrorCode.TokenExpired, context.Exception.Message);
                                await context.Response.WriteAsync(JsonConvert.SerializeObject(error));
                            }

                        };

                        context.Response.OnStarting(callback);

                        return Task.CompletedTask;
                    }
                };

            });

            services.AddCors(options =>
            {
                options.AddPolicy("CorsPolicy",
                    builder => builder.AllowAnyOrigin()
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials());
            });

            services.AddMvc(options =>
            {
                options.Filters.Add(typeof(DomainExceptionFilter));
                options.Filters.Add(typeof(ValidateModelAttribute));
            });

            services.AddSwaggerGen(options =>
            {
                options.DescribeAllEnumsAsStrings();

                options.IncludeXmlComments(
                    Path.ChangeExtension(
                        typeof(Startup).Assembly.Location,
                        "xml"));

                options.SwaggerDoc("v1", new Info
                {
                    Title = appSettings.App.Title,
                    Version = appSettings.App.Version,
                    Description = appSettings.App.Description,
                    TermsOfService = appSettings.App.TermsOfService
                });

                options.AddSecurityDefinition("Bearer", new ApiKeyScheme
                {
                    Description = "JWT Authorization header using the " +
                    "Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                    Name = "Authorization",
                    In = "header",
                    Type = "apiKey"
                });

                options.CustomSchemaIds(x => x.FullName);
            });

            services.AddDirectoryBrowser();
            services.AddScoped<ISieveProcessor, SieveProcessor>();
        }

        public void ConfigureContainer(ContainerBuilder builder)
        {
            builder.RegisterModule(new ConfigurationModule(Configuration));
        }

        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            CreateDefaultDirectories();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseCors("CorsPolicy");

            app.UseMvc();

            app.UseSwagger()
               .UseSwaggerUI(c =>
               {
                   c.SwaggerEndpoint("/swagger/v1/swagger.json", "V1");
               });

            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(
                   Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
                       "uploads", "images")),
                RequestPath = $"/{appSettings.Uploads.ImagesOutputUrl}"
            });

            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(
                Path.Combine(Directory.GetCurrentDirectory(), @"logs")),
                RequestPath = new PathString("/logs"),
                ServeUnknownFileTypes = true,
                DefaultContentType = "text/plain"
            });

            app.UseDirectoryBrowser(new DirectoryBrowserOptions()
            {
                FileProvider = new PhysicalFileProvider(
                    Path.Combine(Directory.GetCurrentDirectory(), @"logs")),
                RequestPath = new PathString("/logs"),
            });
        }

        public static void CreateDefaultDirectories()
        {
            Directory.CreateDirectory(
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
                        "uploads", "images"));

            Directory.CreateDirectory(
                Path.Combine(Directory.GetCurrentDirectory(), "logs"));
        }
    }
}
