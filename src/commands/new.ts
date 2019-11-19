import { prompt, GluegunToolbox, strings, filesystem } from 'gluegun'
import { ProjectType } from '../enums/projectType'

module.exports = {
  name: 'new',
  alias: ['n'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print,
      dependencies,
      project,
      config,
      createDotnetCoreProject,
      createAngularProject
    } = toolbox

    let type = ProjectType.dotnetCore
    let addSuffix = false
    const name = parameters.first
    const options = parameters.options

    // a spinner starts with the text you provide
    const spinner = print.spin('Validating project name...')

    if (!dependencies.hasValidProjectName(name)) {
      print.info(
        `${print.xmark} The project name can´t contain special characters.`
      )
      return
    }

    if (!options.dotnetcore && !options.angular) {
      spinner.stop()

      const result = await prompt.ask([
        {
          type: 'radio',
          name: 'type',
          message: 'Select a type of project? (Use 1,2,3 keys to select)',
          choices: [
            ProjectType.angular,
            ProjectType.dotnetCore,
            ProjectType.both
          ],
          default: ProjectType.dotnetCore
        }
      ])

      type = result.type as ProjectType
    }

    if (options.dotnetCore) {
      type = ProjectType.dotnetCore
    } else if (options.angular) {
      type = ProjectType.angular
    }

    spinner.stop()

    let frontendSuffix = config.project.frontendSuffix
    let backendSuffix = config.project.backendSuffix

    if (
      type === ProjectType.angular &&
      !dependencies.projectNameHasSuffix(name, frontendSuffix)
    ) {
      addSuffix = await prompt.confirm(
        `Do you want cli to add the suffix "${frontendSuffix}" to project name?`
      )
    } else if (
      type === ProjectType.dotnetCore &&
      !dependencies.projectNameHasSuffix(name, backendSuffix)
    ) {
      addSuffix = await prompt.confirm(
        `Do you want cli to add the suffix "${backendSuffix}" to project name?`
      )
    } else if (
      type === ProjectType.both &&
      (!dependencies.projectNameHasSuffix(name, frontendSuffix) ||
        !dependencies.projectNameHasSuffix(name, backendSuffix))
    ) {
      addSuffix = await prompt.confirm(
        `Do you want cli to add the suffixes "${frontendSuffix}", "${backendSuffix}" to project name?`
      )
    }

    const backendProjectName = addSuffix ? `${name} ${backendSuffix}` : name
    const frontendProjectName = addSuffix ? `${name} ${frontendSuffix}` : name

    const alreadyExistsFrontend = await filesystem.existsAsync(
      filesystem.path(strings.kebabCase(frontendProjectName))
    )
    const alreadyExistsBackend = await filesystem.existsAsync(
      filesystem.path(strings.kebabCase(backendProjectName))
    )

    if (alreadyExistsFrontend && type === ProjectType.angular) {
      print.info(
        `${print.xmark} Already exists a project with name ${strings.kebabCase(
          frontendProjectName
        )}!`
      )
      spinner.stop()
      return
    } else if (alreadyExistsBackend && type === ProjectType.dotnetCore) {
      print.info(
        `${print.xmark} Already exists a project with name ${strings.kebabCase(
          backendProjectName
        )}!`
      )
      spinner.stop()
      return
    } else if (
      frontendProjectName === backendProjectName &&
      type === ProjectType.both
    ) {
      print.info(
        `${print.xmark} Can´t generate 2 projects with same name, consider adding a suffix.`
      )
      spinner.stop()
      return
    }

    const response = await dependencies.checkDependencies(type)

    if (response) {
      spinner.start()

      if (type === ProjectType.dotnetCore) {
        spinner.text = `Creating ${strings.kebabCase(backendProjectName)}...`

        const path = await project.createDotnetCore(backendProjectName)

        spinner.stop()

        print.newline()
        spinner.succeed(
          `Successfully created ${strings.kebabCase(
            backendProjectName
          )}!`
        )
        print.info(`At ${path}`);
        print.newline();
        print.info('Next:');
        print.info(`  cd ${strings.kebabCase(backendProjectName)}`)
        print.info(`  coffee designer`);
        print.info(`  coffee update`);

        
        print.newline();
        print.info('Information: ');
        print.newline();
        print.info('Since coffee uses the .NET Core 3.0, we advice you to have the');
        print.info('latest version of Visual Studio 2019 community.');
        print.info('Click on the link below to learn how to update your Visual Studio Community 2019 ');
        print.info('Link: https://docs.microsoft.com/en-us/visualstudio/install/update-visual-studio?view=vs-2019');
        print.newline();
        print.info("Or use Visual Studio Code to code.");
        print.info("Link: https://code.visualstudio.com/");
        
        print.newline()
      } else if (type === ProjectType.angular) {
        spinner.text = `Creating ${strings.kebabCase(frontendProjectName)}...`

        const path = await createAngularProject(frontendProjectName)

        spinner.stop()

        print.newline()
        print.info(
          `${print.checkmark} Successfully created ${strings.kebabCase(
            frontendProjectName
          )}!`
        )
        print.info(`At ${path}`)
        print.newline();
        print.info(`  cd ${strings.kebabCase(frontendProjectName)}`)
        print.info(`  npm install`)
        print.info(`  ng serve`)
        print.newline()
      } else if (type === ProjectType.both) {
        spinner.text = `Creating ${strings.kebabCase(
          backendProjectName
        )} and ${strings.kebabCase(frontendProjectName)}...`

        const pathBackend = await createDotnetCoreProject(backendProjectName)
        const pathFrontend = await createAngularProject(frontendProjectName)

        spinner.stop()

        print.newline();
        spinner.succeed(`${print.checkmark} Successfully created ${strings.kebabCase(
          backendProjectName
        )}`)
        print.info(`At ${pathBackend}`)
        print.info(`At ${pathFrontend}`)
        print.newline();
        print.newline();
        print.info('next:');
        print.info(`  cd ${strings.kebabCase(backendProjectName)}`)
        print.info(`  coffee designer`);
        print.info(`  coffee update`);
        print.newline()
        print.info(`  cd ${strings.kebabCase(frontendProjectName)}`)
        print.info(`  npm install`)
        print.info(`  ng serve`)
        print.newline()
      }
    }

    spinner.stop()
  }
}
