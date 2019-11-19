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
    const cleanProjectName = name.replace('backend', '').replace('Backend', '');

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

    // Create README.md file
     await generate({
      template: 'generator/dotnetCore/project/README.md.ts.ejs',
      target: filesystem.path(projectFolder, 'README.md'),
      props: {
        projectName: strings.upperFirst(cleanProjectName),
        webapiProjectName: `${projectName}.WebApi`
      }
    });

    // Create LICENSE file
    await generate({
      template: 'generator/dotnetCore/project/LICENSE.md.ts.ejs',
      target: filesystem.path(projectFolder, 'LICENSE.md')
    });

    spinner.stop();

    await _createDotnetCoreWebApiLibrary(kebabCaseName);
    await _createDotnetCoreApplicationLibrary(kebabCaseName);
    await _createDotnetCoreDomainLibrary(kebabCaseName);
    await _createDotnetCoreInfrastructureLibrary(kebabCaseName);
    
    await _addDotnerCoreLibrariesReference(kebabCaseName);
    await _createDotnetCoreSolution(kebabCaseName);

    await _installDotnetCorePackages(kebabCaseName);

    return projectFolder;
  }

  async function _createDotnetCoreWebApiLibrary(projectFolderName: string) {
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
    const filesToCreate = _webapiFiles(projectName, webapiFolderName);

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

  async function _createDotnetCoreApplicationLibrary(projectFolderName: string) {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), projectFolderName, config.project.configFileName)
    );
  
    if (!projectConfig) {
        spinner.fail(`Coudn´t find the ${config.project.configFileName} file`)
        return;
    }

    spinner.text = 'Creating Application files...'

    // Get project configurations from 'coffee-cli.json'
    const applicationFolderName = JSON.parse(projectConfig).architecture.application;
    const projectName = JSON.parse(projectConfig).architecture.name;

    // Prepare all files to generate
    const filesToCreate = _applicationFiles(projectName, applicationFolderName);

    for (let index = 0; index < filesToCreate.length; index++) {
      const fileToCreate = filesToCreate[index];
      
      await generate({
        template: `generator/dotnetCore/project/application/${fileToCreate.templatePathName}`,
        target: filesystem.path(
          projectFolderName, 
          applicationFolderName, 
          fileToCreate.templatePathTarget
        ),
        props: fileToCreate.props
      });
    }
    
    spinner.succeed();
  }

  async function _createDotnetCoreDomainLibrary(projectFolderName: string) {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), projectFolderName, config.project.configFileName)
    );
  
    if (!projectConfig) {
        spinner.fail(`Coudn´t find the ${config.project.configFileName} file`)
        return;
    }

    spinner.text = 'Creating Domain files...'

    // Get project configurations from 'coffee-cli.json'
    const domainFolderName = JSON.parse(projectConfig).architecture.domain;
    const projectName = JSON.parse(projectConfig).architecture.name;

    // Prepare all files to generate
    const filesToCreate = _domainFiles(projectName, domainFolderName);

    for (let index = 0; index < filesToCreate.length; index++) {
      const fileToCreate = filesToCreate[index];
      
      await generate({
        template: `generator/dotnetCore/project/domain/${fileToCreate.templatePathName}`,
        target: filesystem.path(
          projectFolderName, 
          domainFolderName, 
          fileToCreate.templatePathTarget
        ),
        props: fileToCreate.props
      });
    }
    
    spinner.succeed();
  }

  async function _createDotnetCoreInfrastructureLibrary(projectFolderName: string) {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), projectFolderName, config.project.configFileName)
    );
  
    if (!projectConfig) {
        spinner.fail(`Coudn´t find the ${config.project.configFileName} file`)
        return;
    }

    spinner.text = 'Creating Infrastructure files...'

    // Get project configurations from 'coffee-cli.json'
    const infrastructureFolderName = JSON.parse(projectConfig).architecture.infrastructure;
    const projectName = JSON.parse(projectConfig).architecture.name;

    // Prepare all files to generate
    const filesToCreate = _infrastructureFiles(projectName, infrastructureFolderName);

    for (let index = 0; index < filesToCreate.length; index++) {
      const fileToCreate = filesToCreate[index];
      
      await generate({
        template: `generator/dotnetCore/project/infrastructure/${fileToCreate.templatePathName}`,
        target: filesystem.path(
          projectFolderName, 
          infrastructureFolderName, 
          fileToCreate.templatePathTarget
        ),
        props: fileToCreate.props
      });
    }
    
    spinner.succeed();
  }

  async function _createDotnetCoreSolution(projectFolderName: string) {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), projectFolderName, config.project.configFileName)
    );
  
    if (!projectConfig) {
        spinner.fail(`Coudn´t find the ${config.project.configFileName} file`)
        return;
    }

    // Get project configurations from 'coffee-cli.json'
    const coffeeCliArchitecture = JSON.parse(projectConfig).architecture;
    const projectName = coffeeCliArchitecture.name;

    const solutionFileName = projectName;
    let solutionScript = `dotnet sln ${solutionFileName}.sln`;

    const webapiFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.webapi
    );

    const applicationFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.application
    );

    const domainFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.domain
    );

    const infrastructureFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.infrastructure
    );

    if(await filesystem.existsAsync(webapiFolderPath)) {
      const webapiFolderName = coffeeCliArchitecture.webapi;

      solutionScript += ` add ${webapiFolderName}/${webapiFolderName}.csproj`;
    }
    
    if(await filesystem.existsAsync(applicationFolderPath)) {
      const applicationFolderName = coffeeCliArchitecture.application;

      solutionScript += ` ${applicationFolderName}/${applicationFolderName}.csproj`;
    }

    if(await filesystem.existsAsync(domainFolderPath)) {
      const domainFolderName = coffeeCliArchitecture.domain;

      solutionScript += ` ${domainFolderName}/${domainFolderName}.csproj`;
    }

    if(await filesystem.existsAsync(infrastructureFolderPath)) {
      const infrastructureFolderName = coffeeCliArchitecture.infrastructure;

      solutionScript += ` ${infrastructureFolderName}/${infrastructureFolderName}.csproj`;
    }
    
    spinner.text = 'Creating solution...'
    
    try {
      await toolbox.system.run(
        `cd ${projectFolderName} && dotnet new sln --name=${solutionFileName}`, 
        { trim: true}
      );

      await toolbox.system.run(`cd ${projectFolderName} && ${solutionScript}`, { trim: true})
      spinner.succeed();
    }
    catch(e) {
      spinner.fail('Failed to create solution...');
    }
    
  }

  async function _addDotnerCoreLibrariesReference(projectFolderName: string) {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), projectFolderName, config.project.configFileName)
    );
  
    if (!projectConfig) {
        spinner.fail(`Coudn´t find the ${config.project.configFileName} file`)
        return;
    }

    // Get project configurations from 'coffee-cli.json'
    const coffeeCliArchitecture = JSON.parse(projectConfig).architecture;

    const webapiFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.webapi
    );

    const applicationFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.application
    );

    const domainFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.domain
    );

    const infrastructureFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.infrastructure
    );

    const existsWebapiLibrary = await filesystem.existsAsync(webapiFolderPath);
    const existsApplicationLibrary = await filesystem.existsAsync(applicationFolderPath);
    const existsDomainLibrary = await filesystem.existsAsync(domainFolderPath);
    const existsInfrastructureLibrary = await filesystem.existsAsync(infrastructureFolderPath);
    
      
    if(existsInfrastructureLibrary && existsDomainLibrary) { 
      spinner.stop();
      spinner.start();
      spinner.text = 'Adding infrastructure project references...'

      try {
        await toolbox.system.run(
          `cd ${infrastructureFolderPath} && dotnet add reference ../${coffeeCliArchitecture.domain}`, 
          { trim: true}
        );

        await toolbox.system.run(
          `cd ${infrastructureFolderPath} && dotnet add reference ../${coffeeCliArchitecture.application}`, 
          { trim: true}
        );
  
        spinner.succeed();
      }
      catch(e) {
        spinner.fail('Failed to add infrastructure project references');
      }
    }

    if(existsApplicationLibrary && existsDomainLibrary) {
      spinner.stop();
      spinner.start();
      spinner.text = 'Adding application project references...'

      try {
        await toolbox.system.run(
          `cd ${applicationFolderPath} && dotnet add reference ../${coffeeCliArchitecture.domain}`, 
          { trim: true}
        );
  
        spinner.succeed();
      }
      catch(e) {
        spinner.fail('Failed to add application project references');
      }
    }

    if(existsWebapiLibrary && applicationFolderPath) {
      spinner.stop();
      spinner.start();
      spinner.text = 'Adding webapi project references...'

      try {
        await toolbox.system.run(
          `cd ${webapiFolderPath} && dotnet add reference ../${coffeeCliArchitecture.application}`, 
          { trim: true}
        );

        if(existsInfrastructureLibrary) {
          await toolbox.system.run(
            `cd ${webapiFolderPath} && dotnet add reference ../${coffeeCliArchitecture.infrastructure}`, 
            { trim: true}
          );
        }
  
        spinner.succeed();
      }
      catch(e) {
        spinner.fail('Failed to add webapi project references');
      }
      
    }
   
  }

  async function _installDotnetCorePackages(projectFolderName: string) {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), projectFolderName, config.project.configFileName)
    );
  
    if (!projectConfig) {
        spinner.fail(`Coudn´t find the ${config.project.configFileName} file`)
        return;
    }


    // Get project configurations from 'coffee-cli.json'
    const coffeeCliArchitecture = JSON.parse(projectConfig).architecture;

    const webapiFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.webapi
    );

    const applicationFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.application
    );

    const infrastructureFolderPath = filesystem.path(
      projectFolderName, 
      coffeeCliArchitecture.infrastructure
    );

    if(await filesystem.existsAsync(webapiFolderPath)) {
      spinner.text = 'Installing WebApi packages...';

      try {
        await toolbox.system.run(
          `cd ${webapiFolderPath} && dotnet restore`,
          {
            trim: true
          }
        )
      }
      catch(e) {
        // do nothing
      }
    }
    
    if(await filesystem.existsAsync(applicationFolderPath)) {
      spinner.text = 'Installing Application packages...';

      try {
        await toolbox.system.run(
          `cd ${applicationFolderPath} && dotnet restore`,
          {
            trim: true
          }
        )
      }
      catch(e) {
        // do nothing
      }
    }

    if(await filesystem.existsAsync(infrastructureFolderPath)) {
      spinner.text = 'Installing Infrastructure packages...';

      try {
        await toolbox.system.run(
          `cd ${infrastructureFolderPath} && dotnet restore`,
          {
            trim: true
          }
        )
      }
      catch(e) {
        // do nothing
      }
    }
    
    spinner.succeed();
  }

  function _webapiFiles(projectName: string, libraryName: string) {
    return [
      {
        templatePathName: 'project-config.csproj.ts.ejs',
        templatePathTarget: `${libraryName}.csproj`,
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
        templatePathName: 'autofac.json.ts.ejs',
        templatePathTarget: 'autofac.json',
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
  }

  function _applicationFiles(projectName: string, libraryName: string) {
    return [
      {
        templatePathName: 'project-config.csproj.ts.ejs',
        templatePathTarget: `${libraryName}.csproj`,
        props: { projectName }
      },
      {
        templatePathName: 'ApplicationException.cs.ts.ejs',
        templatePathTarget: 'ApplicationException.cs',
        props: { projectName }
      },
      {
        templatePathName: 'Outputs/ErrorOutput.cs.ts.ejs',
        templatePathTarget: 'Outputs/ErrorOutput.cs',
        props: { projectName }
      }
    ];
  }

  function _domainFiles(projectName: string, libraryName: string) {
    return [
      {
        templatePathName: 'project-config.csproj.ts.ejs',
        templatePathTarget: `${libraryName}.csproj`,
        props: { projectName }
      },
      {
        templatePathName: 'DomainException.cs.ts.ejs',
        templatePathTarget: 'DomainException.cs',
        props: { projectName }
      }
    ];
  }

  function _infrastructureFiles(projectName: string, libraryName: string) {
    return [
      {
        templatePathName: 'project-config.csproj.ts.ejs',
        templatePathTarget: `${libraryName}.csproj`,
        props: { projectName }
      },
      {
        templatePathName: 'InfrastructureException.cs.ts.ejs',
        templatePathTarget: 'InfrastructureException.cs',
        props: { projectName }
      },
      {
        templatePathName: 'Modules/ApplicationModule.cs.ts.ejs',
        templatePathTarget: 'Modules/ApplicationModule.cs',
        props: { projectName }
      },
      {
        templatePathName: 'Modules/WebApiModule.cs.ts.ejs',
        templatePathTarget: 'Modules/WebApiModule.cs',
        props: { projectName }
      },
      {
        templatePathName: 'DapperDataAccess/Repositories/BaseRepository.cs.ts.ejs',
        templatePathTarget: 'DapperDataAccess/Repositories/BaseRepository.cs',
        props: { projectName }
      },
      {
        templatePathName: 'DapperDataAccess/Module.cs.ts.ejs',
        templatePathTarget: 'DapperDataAccess/Module.cs',
        props: { projectName }
      },
      {
        templatePathName: 'EntityFrameworkDataAccess/Repositories/BaseRepository.cs.ts.ejs',
        templatePathTarget: 'EntityFrameworkDataAccess/Repositories/BaseRepository.cs',
        props: { projectName }
      },
      {
        templatePathName: 'EntityFrameworkDataAccess/Module.cs.ts.ejs',
        templatePathTarget: 'EntityFrameworkDataAccess/Module.cs',
        props: { projectName }
      }
    ];
  }

}