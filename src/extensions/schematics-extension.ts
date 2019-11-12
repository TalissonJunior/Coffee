import { GluegunToolbox } from 'gluegun'
import * as _ from 'lodash';

module.exports = (toolbox: GluegunToolbox) => {
    const { 
    } = toolbox

    toolbox.schematics =  {
        replaceByMatch: replaceByMatch
    };

    /**
     * Replaces a string by match
     * @param data the data from a file
     * @param startKeyword keyword to start the replacement
     * @param endKeyword ketword to end the replacement, this keyword will not
     * be replace is just to know the end of the replacement
     * @param replacement replacement string
     */
    function replaceByMatch(
        data: string,
        startKeyword: string,
        endKeyword: string,
        replacement: string
    ): string {

        const startKeywordMatchIndex = data.indexOf(startKeyword);
        let newData = data;

        if(startKeywordMatchIndex > -1) {
            const startKeywordMatchIndexCloseBracket = 
                data.substr(startKeywordMatchIndex).indexOf(endKeyword);
    
            if(startKeywordMatchIndexCloseBracket > -1) {
                const initialDataWithoutReplacement = data.substr(
                    0, 
                    startKeywordMatchIndex
                );
    
                const endDataWithoutReplacement = data.substr(
                    startKeywordMatchIndex + 
                    startKeywordMatchIndexCloseBracket
                );

                newData = initialDataWithoutReplacement + 
                    ' ' + replacement + 
                    ' ' + endDataWithoutReplacement;
            }       
        }
        
        return newData;
    }

}