import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'usecase',
  run: async (toolbox: GluegunToolbox) => {
    const { print, project, config, dotnetcore } = toolbox

    const spinner = print.spin();
    spinner.start();

    spinner.text = "Generating usecase..."

    const isInsideDotnetCore = await project.isInsideDotnetCore();

    if (!isInsideDotnetCore) {
        spinner.stop();
        print.error("You are not inside of a '.Net Core' project")
        print.info(
            'If you are inside a dotnet core project make' +
            ` sure you have a '${config.project.configFileName}' in the root directory.`
        )

        print.info('To create a new .Net Core project run:')
        print.success(' coffee new yourProjectName --dotnetcore')
        return
    }


    await dotnetcore.checkConnectionString();

    print.debug('usecase');
  }
}
