import { GluegunToolbox, filesystem } from 'gluegun'
import * as _ from 'lodash';

module.exports = (toolbox: GluegunToolbox) => {
    const { 
        print,
        config,
        template: { 
            generate 
        }, 
        prompt
    } = toolbox

    toolbox.dotnetcore =  {
        updateEntitiesAndContext: updateEntitiesAndContext,
        updateDomains: updateDomains,
        checkConnectionString: checkConnectionString
    };

    
  async function checkConnectionString() {
    const spinner = print.spin();
    spinner.start();
    print.newline();

    spinner.text = 'Checking connection string...';

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), config.project.configFileName)
    )
  
    if(!projectConfig){
        spinner.stop();
        print.info(`Coudn´t find the ${config.project.configFileName} file`);
        return;
    }

    // Get webapi folder
    const webapiFolderPath = 
        JSON.parse(projectConfig).architecture.webapi;

    const autofac = require(
        filesystem.path(filesystem.cwd(), webapiFolderPath, 'autofac.json'));
    
    if(!autofac) {
        spinner.stop();
        print.info(`Coudn´t find the ${filesystem.path(webapiFolderPath, 'autofac.json')} file`);
        return;
    }
    
    for (let index = 0; index < autofac.modules.length; index++) {
        const mod = autofac.modules[index];
        
        const isEmptyObject = (obj) => {
            return Object.entries(obj).length === 0 && obj.constructor === Object;
        }

        if(!isEmptyObject(mod.properties) && !mod.properties.ConnectionString) {
            spinner.stop();
            print.info('Coudn´t find a database connection, you must set up one..');
            let hasValidConnection = false;

            do {
                
                let connection = await prompt.ask([
                {
                  type: 'input',
                  name: 'hostname',
                  message: 'What is the Hostname?',
                },
                {
                    type: 'input',
                    name: 'username',
                    message: 'What is the Username?',
                },
                {
                    type: 'input',
                    name: 'schema',
                    message: 'What is the default Schema?',
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'What is the database password?',
                }
              ]);

                // Default port 
                (connection as any).port = 3306;

                spinner.start();
                spinner.text = "Validating connection...";

                const resultConnection = 
                    await toolbox.database.validateConnection(connection);

                if(!resultConnection.isValid) {
                    spinner.stop();
                    print.info(`${print.xmark} ${resultConnection.message}`);
                }

                hasValidConnection = resultConnection.isValid;

                if(hasValidConnection) {
                    spinner.start();
                    spinner.text = "Updating autofac.json...";

                    const connectionString = 
                        `server=${connection.hostname};` + 
                        `port=3306;database=${connection.schema};` + 
                        `user=${connection.username};` + 
                        `password=${connection.password};`;

                    autofac.modules[index].properties.ConnectionString = connectionString;

                    await filesystem.writeAsync(
                        filesystem.path(filesystem.cwd(), webapiFolderPath, 'autofac.json'),
                        JSON.stringify(autofac)
                    )

                    spinner.text = "Formatting autofac.json...";

                    // Format autofac.json file
                    await toolbox.system.run(
                        'prettier --no-semi --trailing-comma --write ' + 
                        JSON.parse(projectConfig).architecture.webapi + '/autofac.json'
                    )

                    spinner.stop();
                }

            } while (!hasValidConnection);
        }
    }

    spinner.stop();
  }

  /**
   * Update dotnet core entities, and context
   */
  async function updateEntitiesAndContext() {
    const spinner = print.spin();
    spinner.start();
    print.newline();

    spinner.text = 'Getting class tables...';

    const classTables =  await toolbox.designer.getClassTables();

    if(!classTables) {
        spinner.stop();
        print.info('There is no class tables to update entities.');
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

    spinner.text = 'Generating Entities...';

    // Get infrastructure folder
    const infrastructure = 
        JSON.parse(projectConfig).architecture.infrastructure;
    const entitiesFolderPath = filesystem.path(infrastructure, 'Entities');    

    // Ensure that server assets is created
    await filesystem.dirAsync(entitiesFolderPath)

    for (let index = 0; index < classTables.length; index++) {
        const classTable = classTables[index];

        await generate({
            template: 'generator/dotnetCore/infrastructure/entity.ts.ejs',
            target: filesystem.path(entitiesFolderPath, classTable.name + '.cs'),
            props: {
                classTable: classTable,
                projectName: JSON.parse(projectConfig).architecture.name
            }
        });

        print.info(`${print.checkmark} Created: ${filesystem.path(entitiesFolderPath, classTable.name + '.cs')}`);
    }

    
    spinner.text = 'Generating Context...';

    // Create context
    const entityFrameworkFolderPath = filesystem.path(
        infrastructure, 
        'EntityFrameworkDataAccess'
    );

    await generate({
        template: 'generator/dotnetCore/infrastructure/context.ts.ejs',
        target: filesystem.path(entityFrameworkFolderPath, 'Context.cs'),
        props: {
            classTables: classTables,
            middleTables: classTables.filter((ct) => ct.isMiddleTable),
            projectName: JSON.parse(projectConfig).architecture.name
        }
    });
    
    spinner.stop();
    print.info(`${print.checkmark} Created: ${filesystem.path(entityFrameworkFolderPath, 'Context.cs')}`);
    spinner.start();

    // Format entities files
    await toolbox.system.run(
        'prettier --print-width 80 --no-semi --single-quote ' + 
        ' --trailing-comma --write ' + 
        JSON.parse(projectConfig).architecture.infrastructure + '/**/*.cs'
    )

    spinner.text = 'Generating Mappings...';

    // Create Mappings
    const mappingsFolderPath = filesystem.path(
        infrastructure, 
        'Mappings'
    );

    await generate({
        template: 'generator/dotnetCore/infrastructure/mapping.ts.ejs',
        target: filesystem.path(mappingsFolderPath, 'MappingProfile.cs'),
        props: {
            classTables: classTables,
            projectName: JSON.parse(projectConfig).architecture.name
        }
    });
    
    spinner.stop();
    print.newline();
    print.info(`${print.checkmark} Created: ${filesystem.path(mappingsFolderPath, 'MappingProfile.cs')}`);
    spinner.start();

    // Format mappings files
    await toolbox.system.run(
        'prettier --print-width 80 --no-semi --single-quote ' + 
        ' --trailing-comma --write ' + 
        JSON.parse(projectConfig).architecture.infrastructure + '/**/*.cs'
    )
    
    spinner.stop();
  }

  
  /**
   * Update dotnet core domains, and context
   */
  async function updateDomains() {
    const spinner = print.spin();
    spinner.start();
    print.newline();

    spinner.text = 'Getting class tables...';

    const classTables =  await toolbox.designer.getClassTables();

    if(!classTables) {
        spinner.stop();
        print.info('There is no class tables to update domains.');
        return;
    }
    
    // Order by isRequired
    classTables.properties = _.orderBy(classTables.properties, ['isRequired'],['asc'])

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), config.project.configFileName)
    )
  
    if(!projectConfig){
        spinner.stop();
        print.info(`Coudn´t find the ${config.project.configFileName} file`);
        return;
    }

    spinner.text = 'Generating Domains...';

    const domain = 
        JSON.parse(projectConfig).architecture.domain;
    const domainsFolderPath = filesystem.path(domain);    

    // Ensure that server assets is created
    await filesystem.dirAsync(domainsFolderPath)
    
    for (let index = 0; index < classTables.length; index++) {
        const classTable = classTables[index];

        if(!classTable.isMiddleTable) {
            // Create folder class directory
            const folderPath = filesystem.path(domainsFolderPath, classTable.name);
            await filesystem.dirAsync(folderPath);

            await generate({
                template: 'generator/dotnetCore/infrastructure/domain.ts.ejs',
                target: filesystem.path(folderPath, classTable.name + '.cs'),
                props: {
                    classTable: classTable,
                    projectName: JSON.parse(projectConfig).architecture.domain
                }
            });

            spinner.stop();
            print.info(`${print.checkmark} Created: ${filesystem.path(folderPath, classTable.name + '.cs')}`);
            spinner.start();
        }
        
    }
    
    spinner.text = 'Fomarting Domains...';

    // Format domain files
    await toolbox.system.run(
        'prettier --print-width 80 --no-semi --single-quote ' + 
        ' --trailing-comma --write ' + 
        JSON.parse(projectConfig).architecture.domain + '/**/*.cs'
    )

    spinner.stop();
  }

}