import { GluegunToolbox } from 'gluegun'

module.exports = (toolbox: GluegunToolbox) => {
    const { 
        print,
        prompt ,
        filesystem,
        template: {
            generate
        },
        config
    } = toolbox

    toolbox.repository =  {
        create
    };

  async function create() {
    const spinner = print.spin();  
  
    spinner.text = "Checking project configurations..."

    const isInsideDotnetCore = await toolbox.project.isInsideDotnetCore();

    if(!isInsideDotnetCore) { 
      spinner.stop();
      return;
    } 

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), config.project.configFileName)
    )
  
    if(!projectConfig){
        spinner.stop();
        print.info(`Coudn´t find the ${config.project.configFileName} file`);
        return;
    }

    spinner.stop();

    const classTables = await toolbox.designer.getClassTables();

    if(!classTables || classTables.lenth === 0) {
        spinner.fail("Coffee coudn´t find any class table");
        print.info("To create class tables type:")
        print.info("  coffee designer");
        return;
    }

    const models = classTables
        .filter((ct) => !ct.isMiddleTable)
        .map((ct) => ct.name);

    const prompResult = await prompt.ask([
      {
        type: 'input',
        name: 'repositoryName',
        message: 'What is the repository name?',
      },
      {
        type: 'radio',
        name: 'repositoryType',
        message: 'Which type of repository do you want to create?',
        choices: [
          'WriteOnly',
          'ReadOnly'
        ]
      }
    ]);

    if(!prompResult.repositoryName) {
        spinner.fail('You must provide a valid repository name.');
        return;
    }

    const domainModelResult = await prompt.ask([
        {
            type: 'select',
            name: 'model',
            message: 'Which domain model do you want to use?',
            choices: models,
        }
    ]);
        
    spinner.start();
    spinner.text = "Creating repository...";

    // Get application folder
    const applicationFolderPath = 
        JSON.parse(projectConfig).architecture.application;
    const infrastructureFolderPath = 
        JSON.parse(projectConfig).architecture.infrastructure;
    const repositoriesApplicationFolderPath = filesystem.path(applicationFolderPath, 'Repositories');    
    const repositoriesInfraEntityFolderPath = filesystem.path(infrastructureFolderPath, 'EntityFrameworkDataAccess/Repositories');    
    const repositoriesInfraDapperFolderPath = filesystem.path(infrastructureFolderPath, 'DapperDataAccess/Repositories');    


    // Ensure that folder path is created
    await filesystem.dirAsync(repositoriesApplicationFolderPath);
    await filesystem.dirAsync(repositoriesInfraEntityFolderPath);
    await filesystem.dirAsync(repositoriesInfraDapperFolderPath);

    // Format repository name
   const repositoryName = 
        toolbox.utils.capitalize(
            prompResult.repositoryName.replace(/repository/g, '')
        );

    if(prompResult.repositoryType === 'WriteOnly') {

        // Create interface
        await generate({
            template: 'generator/dotnetCore/repository/IWriteOnlyRepository.ts.ejs',
            target: filesystem.path(repositoriesApplicationFolderPath, `IWriteOnly${repositoryName}Repository.cs`),
            props: {
                repositoryName, 
                classTable: classTables.find((ct) => ct.name === domainModelResult.model),
                projectName: JSON.parse(projectConfig).architecture.name
            }
        });

        // Create repository
        await generate({
            template: 'generator/dotnetCore/repository/WriteOnlyRepository.ts.ejs',
            target: filesystem.path(repositoriesInfraEntityFolderPath, `${repositoryName}Repository.cs`),
            props: {
                repositoryName, 
                classTable: classTables.find((ct) => ct.name === domainModelResult.model),
                projectName: JSON.parse(projectConfig).architecture.name
            }
        });

        spinner.text = "Formatting repository...";
            
        // Format respository interface
        await toolbox.system.run(
            'prettier --print-width 100 --no-semi --single-quote ' + 
            ' --trailing-comma --write ' + 
            `${applicationFolderPath}/Repositories/IWriteOnly${repositoryName}Repository.cs`
        )

        
        // Format respository 
        await toolbox.system.run(
            'prettier --print-width 100 --no-semi --single-quote ' + 
            ' --trailing-comma --write ' + 
            `${infrastructureFolderPath}/EntityFrameworkDataAccess/Repositories/${repositoryName}Repository.cs`
        )

        spinner.stop();
        print.newline();
        
        spinner.succeed("Created: " + 
            filesystem.path(
                repositoriesApplicationFolderPath, 
                `IWriteOnly${repositoryName}Repository.cs`
            )
        );

        spinner.succeed("Created: " + 
            filesystem.path(
                repositoriesInfraEntityFolderPath, 
                `${repositoryName}Repository.cs`
            )
        );
    }
    // ReadOnly
    else {
        // Create interface
        await generate({
            template: 'generator/dotnetCore/repository/IReadOnlyRepository.ts.ejs',
            target: filesystem.path(repositoriesApplicationFolderPath, `IReadOnly${repositoryName}Repository.cs`),
            props: {
                repositoryName, 
                classTable: classTables.find((ct) => ct.name === domainModelResult.model),
                projectName: JSON.parse(projectConfig).architecture.name
            }
        });

        // Create repository
       await generate({
            template: 'generator/dotnetCore/repository/ReadOnlyRepository.ts.ejs',
            target: filesystem.path(repositoriesInfraDapperFolderPath, `${repositoryName}Repository.cs`),
            props: {
                repositoryName, 
                classTable: classTables.find((ct) => ct.name === domainModelResult.model),
                projectName: JSON.parse(projectConfig).architecture.name
            }
        });

        // Create repository Query
        await generate({
            template: 'generator/dotnetCore/repository/ReadOnlyRepositoryQuery.ts.ejs',
            target: filesystem.path(repositoriesInfraDapperFolderPath, `${repositoryName}Query.cs`),
            props: {
                repositoryName, 
                classTable: classTables.find((ct) => ct.name === domainModelResult.model),
                classTables: classTables,
                projectName: JSON.parse(projectConfig).architecture.name
            }
        });

        spinner.text = "Generating repository...";
            
        // Format respository interface
        await toolbox.system.run(
            'prettier --print-width 100 --no-semi --single-quote ' + 
            ' --trailing-comma --write ' + 
            `${applicationFolderPath}/Repositories/IReadOnly${repositoryName}Repository.cs`
        )

        
        // Format respository 
        await toolbox.system.run(
            'prettier --print-width 100 --no-semi --single-quote ' + 
            ' --trailing-comma --write ' + 
            `${infrastructureFolderPath}/DapperDataAccess/Repositories/${repositoryName}Repository.cs`
        )

        // Format respository 
        await toolbox.system.run(
            'prettier --print-width 100 --no-semi --single-quote ' + 
            ' --trailing-comma --write ' + 
            `${infrastructureFolderPath}/DapperDataAccess/Repositories/${repositoryName}Query.cs`
        )

        // Format code by removing + symbols    
        await toolbox.patching.update(`${infrastructureFolderPath}/DapperDataAccess/Repositories/${repositoryName}Query.cs`, data => {
            return data.replace(/" \+/g, '').replace(/ " /g,' ').replace('"SELECT', '@"SELECT');
        });

        spinner.stop();
        print.newline();

        spinner.succeed("Created: " + 
            filesystem.path(
                repositoriesApplicationFolderPath, 
                `IReadOnly${repositoryName}Repository.cs`
            )
        );

        spinner.succeed("Created: " + 
            filesystem.path(
                repositoriesInfraDapperFolderPath, 
                `${repositoryName}Repository.cs`
            )
        );

        spinner.succeed("Created: " + 
            filesystem.path(
                repositoriesInfraDapperFolderPath, 
                `${repositoryName}Query.cs`
            )
        );
    }
   
  }  

}