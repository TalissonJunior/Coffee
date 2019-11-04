import { GluegunToolbox } from 'gluegun'
import { ApiResponse } from 'apisauce';
import * as os from 'os';
import * as fs from 'fs';
import * as https from 'https';
import { IncomingMessage } from 'http';

module.exports = (toolbox: GluegunToolbox) => {
    const { 
        config, 
        http, 
        filesystem, 
        print, 
        plugin, 
        template: { 
            generate 
        } 
    } = toolbox

    toolbox.designer= { 
        start: start
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
            
            await _downloadFileToDisk(
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

   // Get file  from external url and save it to disk, from external url
   function _downloadFileToDisk(url: string, localPath: string): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
          if(response.statusCode === 200) {
            const b = fs.createWriteStream(localPath);

            b.on('close', () => {
              resolve(response);
            });

            response.pipe(b);
          }
          else {
            reject(response);
          }
        });
    });
  }
  
}
