using Autofac;
using System;

namespace EmptyProject.Infrastructure.Modules
{
    public class WebApiModule : Module
    {
        protected override void Load(ContainerBuilder builder)
        {
            //
            // Register all Types in EmptyProject.WebApi
            //

            Type startup = Type.GetType("EmptyProject.WebApi.Startup, EmptyProject.WebApi");

            builder.RegisterAssemblyTypes(startup.Assembly)
                .AsSelf()
                .InstancePerLifetimeScope();
        }
    }
}
