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

    let editUserName = vscode.commands.registerCommand(
        "debian-changelog-item-creator.editUserName",
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
            let name = config.get("userName");
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

                const { title, version } = parseChangelogLine(changelogLine);
                const newVersion = bumpVersion(version);
                const changelogMessage =
                    "Debian Changelog Item Creator: Automatically added a new changelog item!";

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

                const template = `${title} (${newVersion}) stable; urgency=low\n\n\t* Release ${newVersion}\n\n\t- ${changelogMessage}\n\n\t-- ${name} <${email}> ${formattedDate}`;

                editor.edit((editBuilder) => {
                    editBuilder.insert(editor.selection.active, template);
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
    context.subscriptions.push(editUserName);

    async function promptForName() {
        // Prompt the user to enter their name
        const name = await vscode.window.showInputBox({
            placeHolder: "Enter your name (Firstname Lastname)",
            prompt: "Please enter your name (Firstname Lastname)",
            validateInput: (text) => {
                const nameRegex = /^[a-zA-Z]+ [a-zA-Z]+$/;
                return nameRegex.test(text) && text.includes(" ")
                    ? null
                    : "Please enter your name in the format: Firstname Lastname";
            },
        });

        if (name) {
            // Save the name in the global settings under debian-changelog-item-creator namespace
            const config = vscode.workspace.getConfiguration(
                "debian-changelog-item-creator"
            );
            await config.update(
                "userName",
                name,
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
        const regex = /^(.*?) \((.*?)\) stable; urgency=low$/;
        const match = line.match(regex);

        if (match) {
            return {
                title: match[1],
                version: match[2],
            };
        }

        return {
            title: "",
            version: "",
        };
    }

    function findChangelogLine(editor) {
        const document = editor.document;
        const cursorPosition = editor.selection.active.line;

        for (let i = cursorPosition; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            if (lineText.match(/^(.*?) \((.*?)\) stable; urgency=low$/)) {
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
