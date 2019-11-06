import { GluegunToolbox } from 'gluegun'
import { ApiResponse } from 'apisauce';
import * as os from 'os';
import { GluegunFileSystemInspectTreeResult, GluegunFileSystemInspectResult } from 'gluegun/build/types/toolbox/filesystem-types';
import { ClassTable } from '../models/class-table/class-table';
import * as _ from 'lodash';

module.exports = (toolbox: GluegunToolbox) => {
    const { 
        config, 
        http, 
        filesystem, 
        print, 
        plugin, 
        template: { 
            generate 
        },
        semver
    } = toolbox

    toolbox.designer= { 
        start: start,
        hasChangeClassTables: hasChangeClassTables,
        getClassTables: getClassTables
    } 

  async function start() {
    const spinner = print.spin();
    const designerJsFileName = 'CoffeeDesigner.min.js';
    const designerCssFileName = 'CoffeeDesigner.min.css';

    spinner.start();

    spinner.text = 'Creating Coffee Designer Server files...';

    const projectConfig = await filesystem.readAsync(
      filesystem.path(filesystem.cwd(), config.project.configFileName)
    )

    if(!projectConfig){
        spinner.stop();
        print.info(`${print.xmark} Coudn´t find ${config.project.configFileName} file...`);
        return;
    }

    const designerHistoryFolderName = JSON.parse(projectConfig).architecture.designer
    const designerTempServerPath = filesystem.path(
      os.tmpdir(),
      'coffee-designer/server'
    )

    // Ensure that the temporary server folder and project folder are created
    await filesystem.dirAsync(designerTempServerPath)
    await filesystem.dirAsync(designerHistoryFolderName)

    // Copy the designer template to the temporary server dir
    await filesystem.copyAsync(
       filesystem.path(plugin.directory, 'templates/coffee-designer'),
       designerTempServerPath,
       {
         overwrite: true
       }
    )

    spinner.text = 'Updating Coffee Designer Server files...';
 
    // Update start.js file server
    await generate({
       template: 'coffee-designer/start.js',
       target: filesystem.path(designerTempServerPath, 'start.js'),
       props: {
         projectDirName: designerHistoryFolderName,
         currentDir: filesystem.cwd().replace(/\\/g, '/')
       }
    });

    // Update index.html file server 
    await generate({
        template: 'coffee-designer/index.html',
        target: filesystem.path(designerTempServerPath, 'index.html'),
        props: {
            designerJS: designerJsFileName,
            designerCSS: designerCssFileName
        }
    })
    
    spinner.text = 'Syncing Coffee Designer Server files...';

    const ltVersion = await _getLatestDesignerFileVersion();

    if(ltVersion) {
        await toolbox.localStorage.setValue('lastCoffeeVersion', ltVersion);
    }

    try {
        await syncFiles(
            designerJsFileName,
            designerCssFileName,
            designerTempServerPath
        );

        spinner.stop();
        print.info('Started Coffee Designer...')

        await toolbox.system.run(
          'electron ' + filesystem.path(designerTempServerPath, 'start')
        )
    }
    catch(e) {
        spinner.stop();

        const jsExists = await filesystem
            .existsAsync(filesystem.path(
                designerTempServerPath,
                designerJsFileName
            ));

        const cssExists = await filesystem
            .existsAsync(filesystem.path(
                designerTempServerPath,
                designerCssFileName
            ));
        
        if(jsExists && cssExists) {
            print.info('Coudn´t sync Coffee Designer server files, switching to temporary cached files.')
            print.info('Started Coffee Designer...')

            await toolbox.system.run(
              'electron ' + filesystem.path(designerTempServerPath, 'start')
            )
        }    
        else {
            print.info(`${print.xmark} Failed to sync Coffee Designer server files`);
            print.error(e.message);
        }
    }
  
  }

  /**
   * It check if that was any change on the generated designer json file
   */
  async function hasChangeClassTables(): Promise<boolean> {

    const latestVersion = await toolbox.localStorage.getValue('lastCoffeeVersion');
    const currentVersion = await _getLatestDesignerFileVersion();

    if(semver.valid(currentVersion) && semver.valid(latestVersion) && 
        semver.gt(currentVersion, latestVersion)) {
       return true;
    }
    
    return false;
  }

  /**
   * Returns an array with the latest class tables from version folder
   */
  async function getClassTables(): Promise<Array<ClassTable>> {
    const currentVersion = await _getLatestDesignerFileVersion();

    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), config.project.configFileName)
    )
  
    if(!projectConfig){
        return null;
    }
    
    const designerVersionFolderName = 
        JSON.parse(projectConfig).architecture.designer

    const jsonData = await filesystem.readAsync(filesystem.path(
        designerVersionFolderName, 
        currentVersion + '.json'
    ));

    if(!jsonData) {
        return [];
    }

    const currentClassTables = JSON.parse(jsonData).data.classTables as Array<ClassTable>;

    // Check for middle tables
    for (let index = 0; index < currentClassTables.length; index++) {
        const classTable = currentClassTables[index];

        const countForeignKeys = _.sumBy(classTable.properties, (property) => property.isForeignKey);
        currentClassTables[index].isMiddleTable = countForeignKeys === 2 ? true : false;
    }  

    // Check for associations based on middle tables
    const middleTables = currentClassTables.filter((classTable) => classTable.isMiddleTable);
    
    if(middleTables.length > 0) {
        for (let index = 0; index < currentClassTables.length; index++) {
            const classTable = currentClassTables[index];
            
            for (let j = 0; j < middleTables.length; j++) {
                const middleTable = middleTables[j];
                
                // Check if the current class table is not a middle table
                if(!classTable.isMiddleTable) {
                   const foreignProperty = middleTable.properties
                    .filter(mt=> mt.isForeignKey )
                    .find((mt) => mt.foreign.table === classTable.name);

                   // Check if the current class table has a relation with the middle table
                   if(foreignProperty) {
                        currentClassTables[index].hasRelations = true;

                        if(!currentClassTables[index].tableRelations) {
                            currentClassTables[index].tableRelations = new Array<ClassTable>();
                        }

                        if(!middleTable.firstMiddleTablePropety) {
                            middleTable.firstMiddleTablePropety = foreignProperty;
                        } 
                        else {
                            middleTable.secondMiddleTablePropety = foreignProperty;
                        }
                        
                        currentClassTables[index].tableRelations.push(middleTable);
                   }
                }
            }
        }  
    }

    return currentClassTables;
  }

  /**
   * It will try to download remote files to the local server folder,
   * If it fails and already has files on the server, then it will use the local
   * files otherwise will show an error saying that it fails to access 
   * internet connection
   */
  async function syncFiles(
    designerJsFileName: string,
    designerCssFileName: string,
    serverPath: string
  ) {
    const repositoryApiUrl = config.coffeeDesigner.repositoryApiUrl;
    const downloadRepositoryUrl = config.coffeeDesigner.downloadRepositoryUrl;

    // Base download files url
    const baseRepositoryDownloadFile = http.create({
        baseURL: downloadRepositoryUrl,
        headers: { Accept: 'application/json', responseType: 'stream' },
    });

    // Base api files url
    const baseRepositoryApiFile = http.create({
        baseURL: repositoryApiUrl,
        headers: { Accept: 'application/json' },
    });

    // Download JS  
    const designerJsFileResponse = 
        await baseRepositoryDownloadFile.get(`dist/${designerJsFileName}`);

    await _validateResponse(designerJsFileResponse, async () => {
        await filesystem.writeAsync(
            filesystem.path(serverPath,designerJsFileName), 
            designerJsFileResponse.data
        );    
    });

    // Download CSS  
    const designerCssFileResponse = 
        await baseRepositoryDownloadFile.get(`dist/${designerCssFileName}`);

    await _validateResponse(designerCssFileResponse, async () => {
        await filesystem.writeAsync(
            filesystem.path(serverPath,designerCssFileName), 
            designerCssFileResponse.data
        );
    })

    // Read Assets files server dir and download them
    const assetsResponse = 
        await baseRepositoryApiFile.get('dist/assets');
    const serverAssets = filesystem.path(serverPath, 'assets')

    // Ensure that server assets is created
    await filesystem.dirAsync(serverAssets)

    await _validateResponse(assetsResponse, async () => {
        // Check https://api.github.com/repos/{userName}/{repository}/contents/dist/assets
        // to see the available properties
        for (let index = 0; index < (assetsResponse.data as any).length; index++) {
            const element = assetsResponse.data[index];
            
            await toolbox.utils.downloadFileToDisk(
                element.download_url, 
                filesystem.path(serverAssets, element.name)
            );
        }
    });
  }

  /**
   * Generic validator for fetch responses,
   * if the response is 202 or 'ok' then it wille execute the callback
   * @param response ApiResponse<unknown, unknown>
   * @param callback  () => void
   */
  async function _validateResponse(
      response: ApiResponse<unknown, unknown>, 
     callback: () => void) {

    if(response.ok) {
        callback();
    }
    // Repository might be deleted or the files assets has change the name   
    else if(response.status === 404) {
        throw Error('Error syncing server files');
    }
    else {
        throw Error('Internert connection failed, make sure you´re connected ' +
            'to a stable internet connection.');
    }
  }

  async function _getLatestDesignerFileVersion() {
    const projectConfig = await filesystem.readAsync(
        filesystem.path(filesystem.cwd(), config.project.configFileName)
    )
  
    if(!projectConfig){
        return null;
    }
    
    const designerVersionFolderName = 
        JSON.parse(projectConfig).architecture.designer

    const dirTree = await filesystem.inspectTreeAsync(
        filesystem.path(designerVersionFolderName)
    ) as GluegunFileSystemInspectTreeResult;

    
    if(!dirTree) {
        return null;
    }

    let version = '1.1.0';

    for (let index = 0; index < dirTree.children.length; index++) {
        const file = dirTree.children[index] as GluegunFileSystemInspectResult;

        if(file.type === 'file') {
            const fileVersion = file.name.replace('.json','');

            if(semver.valid(fileVersion) && semver.gt(fileVersion, version)) {
                version = fileVersion;
            } 
        }
    }
   
    return version;
  }
  
  
}
