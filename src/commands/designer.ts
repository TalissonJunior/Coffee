import { GluegunToolbox } from 'gluegun'
import { CliProjectConfig } from '../models/cli-project-config'
import { ProjectType } from '../enums/projectType'

module.exports = {
  name: 'designer',
  run: async (toolbox: GluegunToolbox) => {
    const {
      print,
      project,
      config,
      designer
    } = toolbox

    const projectConfigFile = (await project.isInsideDotnetCore()) as CliProjectConfig

    if (!projectConfigFile) {
      print.error("You are not inside of a '.Net Core' project")
      print.info(
        'If you are inside a dotnet core project make' +
          ` sure you have a '${config.project.configFileName}' in the root directory.`
      )

      print.info('To create a new .Net Core project run:')
      print.success(' coffee new yourProjectName --dotnetcore')
      return
    }
    
    const allInstalled = await project.checkDependencies(ProjectType.dotnetCore)

    if(allInstalled) {
      await designer.start();
    }
    else {
      print.info('Failed to install .Net Core dependencies...')
    }
   
  }
}
