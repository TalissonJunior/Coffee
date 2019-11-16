import { GluegunToolbox } from 'gluegun'
const crypto = require('crypto')

module.exports = (toolbox: GluegunToolbox) => {
    const { 
      strings,
      filesystem,
      template: {
        generate
      },
      config,
      print
    } = toolbox

  toolbox.project = {
    createDotnetCore,
  }

  async function createDotnetCore(name: string) {
    if (!name) {
      return false
    }

    const spinner = print.spin()

    spinner.text = 'Creating project configurations...'

    // Used for the project folder name
    let kebabCaseName = name;
    // used for project name
    let pascalCaseName = name;

    kebabCaseName = strings.kebabCase(kebabCaseName); // 'name-prefix'
    pascalCaseName = strings.pascalCase(pascalCaseName); // 'NamePrefix'

    const projectName = pascalCaseName;
    const projectFolder = filesystem.path(kebabCaseName);

    // Ensure project folder is created
    await filesystem.dirAsync(projectFolder);

    // Create coffee cli json file
    await generate({
        template: 'generator/dotnetCore/project/coffee-cli.ts.ejs',
        target: filesystem.path(projectFolder, 'coffee-cli.json'),
        props: {
          projectName
        }
    });

    // Create .gitignore file
    await generate({
      template: 'generator/dotnetCore/project/.gitignore.ts.ejs',
      target: filesystem.path(projectFolder, '.gitignore')
    });

    spinner.stop();

    await _createDotnetCoreWebApi(kebabCaseName);
  }

  async function _createDotnetCoreWebApi(projectFolderName: string) {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), projectFolderName, config.project.configFileName)
    );
  
    if (!projectConfig) {
        spinner.fail(`Coudn´t find the ${config.project.configFileName} file`)
        return;
    }

    spinner.text = 'Creating WebApi files...'

    // Get project configurations from 'coffee-cli.json'
    const webapiFolderName = JSON.parse(projectConfig).architecture.webapi;
    const projectName = JSON.parse(projectConfig).architecture.name;

    // Prepare all files to generate
    const filesToCreate = [
      {
        templatePathName: 'project-config.csproj.ts.ejs',
        templatePathTarget: `${webapiFolderName}.csproj`,
        props: { projectName }
      },
      {
        templatePathName: 'Program.cs.ts.ejs',
        templatePathTarget: 'Program.cs',
        props: { projectName }
      },
      {
        templatePathName: 'Startup.cs.ts.ejs',
        templatePathTarget: 'Startup.cs',
        props: { projectName }
      },
      {
        templatePathName: 'appsettings.json.ts.ejs',
        templatePathTarget: 'appsettings.json',
        props: { 
          app: {
            title: projectName,
            env: null
          },
          jwt: {
            secret: crypto.randomBytes(32).toString('hex'),
            tokenDuration: 7,
            issuer: `webapi.${projectName}`,
            audience: `webapi.${projectName.toLowerCase()}.com`,
            passwordResetTokenDuration: 120
          },
          emailSettings: {
            host: 'smtp.kinghost.net',
            email: 'suporte@coffee.com.br',
            password: 'links@525950'
          }
        }
      },
      {
        templatePathName: 'appsettings.Development.json.ts.ejs',
        templatePathTarget: 'appsettings.Development.json',
        props: { 
          app: {
            title: projectName,
            env: 'Development'
          },
          jwt: {
            secret: crypto.randomBytes(32).toString('hex'),
            tokenDuration: 7,
            issuer: `webapi.${projectName}`,
            audience: `webapi.${projectName.toLowerCase()}.com`,
            passwordResetTokenDuration: 120
          },
          emailSettings: {
            host: 'smtp.kinghost.net',
            email: 'suporte@coffee.com.br',
            password: 'links@525950'
          }
        }
      },
      {
        templatePathName: 'Properties/launchSettings.json.ts.ejs',
        templatePathTarget: 'Properties/launchSettings.json',
        props: { projectName }
      },
      {
        templatePathName: 'Configurations/AppSettings.cs.ts.ejs',
        templatePathTarget: 'Configurations/AppSettings.cs',
        props: { projectName }
      },
      {
        templatePathName: 'Filters/DomainExceptionFilter.cs.ts.ejs',
        templatePathTarget: 'Filters/DomainExceptionFilter.cs',
        props: { projectName }
      },
      {
        templatePathName: 'Filters/ValidateModelAttribute.cs.ts.ejs',
        templatePathTarget: 'Filters/ValidateModelAttribute.cs',
        props: { projectName }
      },
       
    ];

    for (let index = 0; index < filesToCreate.length; index++) {
      const fileToCreate = filesToCreate[index];
      
      await generate({
        template: `generator/dotnetCore/project/webapi/${fileToCreate.templatePathName}`,
        target: filesystem.path(
          projectFolderName, 
          webapiFolderName, 
          fileToCreate.templatePathTarget
        ),
        props: fileToCreate.props
      });
    }
    
    spinner.succeed();
  }

}