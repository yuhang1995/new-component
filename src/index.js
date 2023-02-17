const fs = require('fs');
const path = require('path');

const {
    createParentDirectoryIfNecessary,
    logItemCompletion,
    logConclusion,
} = require('./helpers');
const {
    mkDirPromise,
    readFilePromiseRelative,
    writeFilePromise,
} = require('./utils');

const {
    text,
    select,
    intro,
    cancel,
    isCancel,
} = require("@clack/prompts");
const color = require("picocolors");
const { setTimeout } = require("node:timers/promises");

async function main() {
    console.clear();

    await setTimeout(1000);

    intro(`${color.bgCyan(color.black(" create-new-component "))}`);

    const dir = await text({
        message: "Where should we create your component?",
        placeholder: "",
    }) || './';

    if (isCancel(dir)) {
        cancel("Operation cancelled.");
        process.exit(0);
    }

    const languageType = await select({
        message: "Pick a language.",
        options: [
            { value: "js", label: "JavaScript" },
            { value: "ts", label: "TypeScript" },
        ],
    });

    if (isCancel(languageType)) {
        cancel("Operation cancelled.");
        process.exit(0);
    }

    const fileExtension = languageType === 'js' ? 'js' : 'tsx';
    const indexExtension = languageType === 'js' ? 'js' : 'ts';

    const exportMode = await select({
        message: "Select export mode.",
        initialValue: 'export',
        options: [
            { value: "export", label: "export" },
            { value: "", label: "export default" },
        ],
    });

    if (isCancel(exportMode)) {
        cancel("Operation cancelled.");
        process.exit(0);
    }

    const componentName = await text({
        message: "what's your component name?",
        placeholder: "",
    });

    if (isCancel(componentName)) {
        cancel("Operation cancelled.");
        process.exit(0);
    }

    // Find the path to the selected template file.
    const templatePath = `./templates/${languageType}${!!exportMode ? '-export' : ''}.js`;

    // Get all of our file paths worked out, for the user's project.
    const componentDir = `${dir}/${componentName}`;

    const filePath = `${componentDir}/${componentName}.${fileExtension}`;
    const indexPath = `${componentDir}/index.${indexExtension}`;

    // Our index template is super straightforward, so we'll just inline it for now.
    const indexTemplate = `\
    export * from './${componentName}';
    export { default } from './${componentName}';
    `;

    createParentDirectoryIfNecessary(dir);

    // Check to see if this component has already been created
    const fullPathToComponentDir = path.resolve(componentDir);
    if (fs.existsSync(fullPathToComponentDir)) {
        cancel(
            `Looks like this component already exists! There's already a component at ${fullPathToComponentDir}.\nPlease delete this directory and try again.`
        );
        process.exit(0);
    }

    // Start by creating the directory that our component lives in.
    return await mkDirPromise(fullPathToComponentDir)
        .then(() => readFilePromiseRelative(templatePath))
        .then((template) => {
            logItemCompletion('Directory created.');
            return template;
        })
        .then((template) =>
            // Replace our placeholders with real data (so far, just the component name)
            template.replace(/COMPONENT_NAME/g, componentName)
        )
        .then((template) =>
            // Format it using prettier, to ensure style consistency, and write to file.
            writeFilePromise(filePath, template)
        )
        .then((template) => {
            logItemCompletion('Component built and saved to disk.');
            return template;
        })
        .then((template) =>
            // We also need the `index.js` file, which allows easy importing.
            writeFilePromise(indexPath, indexTemplate)
        )
        .then((template) => {
            logItemCompletion('Index file built and saved to disk.');
            return template;
        })
        .then((template) => {
            return logConclusion();
        })
        .catch((err) => {
            console.error(err);
        });


}

main().catch(console.error);
