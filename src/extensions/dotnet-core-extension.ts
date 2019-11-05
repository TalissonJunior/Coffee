import { GluegunToolbox, filesystem } from 'gluegun'
import * as _ from 'lodash';

module.exports = (toolbox: GluegunToolbox) => {
    const { 
        print,
        config,
        template: { 
            generate 
        }, 
    } = toolbox

    toolbox.dotnetcore =  {
        updateEntities: updateEntities,
        updateDomains: updateDomains
    };

  /**
   * Update dotnet core entities, and context
   */
  async function updateEntities() {
    const classTables =  await toolbox.designer.getClassTables();

    if(!classTables) {
        print.info('There is no class tables to update entities.');
        return;
    }
    
    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), config.project.configFileName)
    )
  
    if(!projectConfig){
        print.info(`Coudn´t find the ${config.project.configFileName} file`);
        return;
    }
    
    // Get infrastructure folder
    const infrastructure = 
        JSON.parse(projectConfig).architecture.infrastructure;
    const entitiesFolderPath = filesystem.path(infrastructure, 'Entities');    

    // Ensure that server assets is created
    await filesystem.dirAsync(entitiesFolderPath)

    for (let index = 0; index < classTables.length; index++) {
        const classTable = classTables[index];

        await generate({
            template: 'generator/dotnetCore/entity.ts.ejs',
            target: filesystem.path(entitiesFolderPath, classTable.name + '.cs'),
            props: {
                classTable: classTable,
                projectName: JSON.parse(projectConfig).architecture.name
            }
        });
    }

    // Format entities files
    await toolbox.system.run(
        'prettier --print-width 80 --no-semi --single-quote ' + 
        ' --trailing-comma --write ' + 
        JSON.parse(projectConfig).architecture.infrastructure + '/**/*.cs'
    )
  }

  
  /**
   * Update dotnet core domains, and context
   */
  async function updateDomains() {
    const classTables =  await toolbox.designer.getClassTables();

    if(!classTables) {
        print.info('There is no class tables to update domains.');
        return;
    }
    
    // Order by isRequired
    classTables.properties = _.orderBy(classTables.properties, ['isRequired'],['asc'])

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), config.project.configFileName)
    )
  
    if(!projectConfig){
        print.info(`Coudn´t find the ${config.project.configFileName} file`);
        return;
    }

    const domain = 
        JSON.parse(projectConfig).architecture.domain;
    const domainsFolderPath = filesystem.path(domain);    

    // Ensure that server assets is created
    await filesystem.dirAsync(domainsFolderPath)

    for (let index = 0; index < classTables.length; index++) {
        const classTable = classTables[index];
        
        // Create folder class directory
        const folderPath = filesystem.path(domainsFolderPath, classTable.name);
        await filesystem.dirAsync(folderPath);

        await generate({
            template: 'generator/dotnetCore/domain.ts.ejs',
            target: filesystem.path(folderPath, classTable.name + '.cs'),
            props: {
                classTable: classTable,
                projectName: JSON.parse(projectConfig).architecture.domain
            }
        });
    }
    
    // Format domain files
    await toolbox.system.run(
        'prettier --print-width 80 --no-semi --single-quote ' + 
        ' --trailing-comma --write ' + 
        JSON.parse(projectConfig).architecture.domain + '/**/*.cs'
    )
  }

}