import { GluegunToolbox } from 'gluegun'
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig'
import * as os from 'os';

module.exports = (toolbox: GluegunToolbox) => {
    const { filesystem } = toolbox

    toolbox.localStorage =  {
        setValue: setValue,
        getValue: getValue
    };

  async function _init(): Promise<JsonDB> {
    const localStorageTempServerPath = filesystem.path(
        os.tmpdir(),
        'coffee-designer/localstorage'
    )
      
    // Ensure that the temporary folder is created
    await filesystem.dirAsync(localStorageTempServerPath)

    return new JsonDB(new Config(filesystem.path(
        localStorageTempServerPath, 
        "coffee-database"
        )
    ));
  }  

  async function setValue(key: string, value: any): Promise<any> {
    const db = await _init();

    db.push(key, value, true);
  }

  async function getValue(key: string): Promise<any> {
    try {
        const db = await _init();

        return db.getData(key);
    } catch(error) {
        return null;
    };
  }
}