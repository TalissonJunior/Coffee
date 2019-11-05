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
      designer,
      prompt,
      dotnetcore
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
      
      const hasChange = await designer.hasChangeClassTables();

      print.info(`Coffe Designer has ended.`);
      print.newline();

      if(!hasChange) {
        print.info('There was no change to apply.');
        
        return;
      }
      
      const requiredResult = await prompt.ask([
        {
          type: 'radio',
          name: 'required',
          message: `It seems that you have made some changes, do you want Coffe to update your project?:`,
          choices: ['Yes', 'No']
        }
      ])
  
      const updateProject = requiredResult.required === 'Yes' ? true : false
      
      if(!updateProject) {
        print.newline();
        print.info('Don´t forget to update your project')
        print.newline();
        print.info('run: ');
        print.info(' coffee update');
        return;
      }

      // Generate entities
      await dotnetcore.updateEntities();
    }
    else {
      print.info('Failed to install .Net Core dependencies...')
    }
   
  }
}
