const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let editEmailAddress = vscode.commands.registerCommand(
        "debian-changelog-item-creator.editEmailAddress",
        async function () {
            await promptForEmail();
        }
    );

    let editName = vscode.commands.registerCommand(
        "debian-changelog-item-creator.editName",
        async function () {
            await promptForName();
        }
    );

    let newChangelogItem = vscode.commands.registerCommand(
        "debian-changelog-item-creator.newChangelogItem",
        async function () {
            const config = vscode.workspace.getConfiguration(
                "debian-changelog-item-creator"
            );
            let name = config.get("name");
            let email = config.get("emailAddress");

            if (!name) {
                name = await promptForName();
            }

            if (!email) {
                email = await promptForEmail();
            }

            if (!name || !email) {
                vscode.window.showErrorMessage(
                    "Debian Changelog Item Creator: Name or Email is not set."
                );
                return;
            }

            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const changelogLine = findChangelogLine(editor);
                if (!changelogLine) {
                    vscode.window.showErrorMessage(
                        "Debian Changelog Item Creator: No changelog line found below the cursor."
                    );
                    return;
                }

                const { title, version, distribution } =
                    parseChangelogLine(changelogLine);
                const newVersion = bumpVersion(version);
                let changelogMessage = "";

                // Check if there is selected text
                const selection = editor.selection;
                if (!selection.isEmpty) {
                    changelogMessage = editor.document.getText(selection);
                    // Remove the selected text
                    await editor.edit((editBuilder) => {
                        editBuilder.delete(selection);
                    });
                } else {
                    // Check if the cursor is at the end of a line with text
                    const cursorPosition = editor.selection.active;
                    const lineText = editor.document.lineAt(
                        cursorPosition.line
                    ).text;
                    if (cursorPosition.character === lineText.length) {
                        changelogMessage = lineText.trim();
                        // Remove the line text
                        await editor.edit((editBuilder) => {
                            editBuilder.delete(
                                new vscode.Range(
                                    cursorPosition.line,
                                    0,
                                    cursorPosition.line,
                                    lineText.length
                                )
                            );
                        });
                    }
                }

                // Format the changelog message with indentation and bullet points
                const formattedChangelogMessage = changelogMessage
                    .split("\n")
                    .map((line) => `    - ${line.trim()}`)
                    .join("\n");

                // Function to format the date string in the desired format
                const formatDate = (date) => {
                    const options = {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        timeZoneName: "short",
                        hour12: false,
                    };

                    const formatter = new Intl.DateTimeFormat("en-US", options);

                    const parts = formatter
                        .formatToParts(date)
                        .reduce((acc, part) => {
                            acc[part.type] = part.value;
                            return acc;
                        }, {});

                    const day = parts.day.padStart(2, "0");
                    const month = parts.month;
                    const year = parts.year;
                    const weekday = parts.weekday;
                    const hour = parts.hour.padStart(2, "0");
                    const minute = parts.minute.padStart(2, "0");
                    const second = parts.second.padStart(2, "0");
                    const timeZoneOffset = date
                        .toString()
                        .match(/([+-][0-9]{4})/)[1];

                    return `${weekday}, ${day} ${month} ${year} ${hour}:${minute}:${second} ${timeZoneOffset}`;
                };

                const currentDate = new Date();
                const formattedDate = formatDate(currentDate);

                const template = `${title} (${newVersion}) ${distribution}; urgency=low\n\n    * Release ${newVersion}\n\n${formattedChangelogMessage}\n\n    -- ${name} <${email}> ${formattedDate}`; // Using normal spaces instead of tabs to prevent issues with syntax highlighting and positioning

                editor
                    .edit((editBuilder) => {
                        editBuilder.insert(editor.selection.active, template);
                    })
                    .then(() => {
                        if (!changelogMessage) {
                            // Place the cursor at the position of changelogMessage
                            const position = editor.selection.active;
                            const newPosition = position.with(
                                position.line - 2, // Determines line
                                6 // Determines position in line
                            );
                            editor.selection = new vscode.Selection(
                                newPosition,
                                newPosition
                            );
                            editor.revealRange(
                                new vscode.Range(newPosition, newPosition)
                            );
                        }
                    });
            } else {
                vscode.window.showErrorMessage(
                    "Debian Changelog Item Creator: No active text editor found."
                );
            }
        }
    );

    context.subscriptions.push(newChangelogItem);
    context.subscriptions.push(editEmailAddress);
    context.subscriptions.push(editName);

    async function promptForName() {
        // Prompt the user to enter their name
        const name = await vscode.window.showInputBox({
            placeHolder: "Enter your name (Firstname Lastname)",
            prompt: "Please enter your name (Firstname Lastname)",
            validateInput: (text) => {
                return text.trim() === ""
                    ? "Name cannot be empty or contain only spaces"
                    : null;
            },
        });

        if (name && name.trim() !== "") {
            // Save the name in the global settings under debian-changelog-item-creator namespace
            const config = vscode.workspace.getConfiguration(
                "debian-changelog-item-creator"
            );
            await config.update(
                "name",
                name.trim(),
                vscode.ConfigurationTarget.Global
            );

            vscode.window.showInformationMessage("Name saved successfully!");
        } else {
            vscode.window.showWarningMessage("Name input was cancelled.");
        }
        return name;
    }

    async function promptForEmail() {
        // Prompt the user to enter their email address
        const email = await vscode.window.showInputBox({
            placeHolder: "Enter your email address",
            prompt: "Please enter your email address",
            validateInput: (text) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(text)
                    ? null
                    : "Please enter a valid email address";
            },
        });

        if (email) {
            // Save the email address in the global settings under debian-changelog-item-creator namespace
            const config = vscode.workspace.getConfiguration(
                "debian-changelog-item-creator"
            );
            await config.update(
                "emailAddress",
                email,
                vscode.ConfigurationTarget.Global
            );

            vscode.window.showInformationMessage(
                "Email address saved successfully!"
            );
        } else {
            vscode.window.showWarningMessage(
                "Email address input was cancelled."
            );
        }
        return email;
    }

    function parseChangelogLine(line) {
        const regex = /^(.*?) \((.*?)\) (.*?); urgency=low$/;
        const match = line.match(regex);

        if (match) {
            return {
                title: match[1],
                version: match[2],
                distribution: match[3],
            };
        }

        return {
            title: "",
            version: "",
            distribution: "stable", // Default to "stable" if not found
        };
    }

    function findChangelogLine(editor) {
        const document = editor.document;
        const cursorPosition = editor.selection.active.line;

        for (let i = cursorPosition; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            if (lineText.match(/^(.*?) \((.*?)\) (.*?); urgency=low$/)) {
                return lineText;
            }
        }

        return null;
    }

    function bumpVersion(version) {
        const parts = version.split(".").map(Number);
        parts[parts.length - 1]++;
        return parts.join(".");
    }
}

module.exports = {
    activate,
};
