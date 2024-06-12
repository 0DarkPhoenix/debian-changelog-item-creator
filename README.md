# Debian Changelog Item Creator

## Overview

The "Debian Changelog Item Creator" extension for Visual Studio Code helps you easily create and manage changelog entries for Debian packages. This extension streamlines the process of adding new changelog items, ensuring they are formatted correctly and include necessary metadata such as version, urgency, and author details.

## Features

- **Automatic Changelog Entry Creation**: Quickly add new changelog entries with the correct format.
- **User Configuration**: Set and save your name and email for use in changelog entries.
- **Date Formatting**: Automatically formats the date in the required Debian changelog format.
- **Version Bumping**: Automatically increments the version number for new changelog entries.

## Usage

1. **Set User Information**:
    - Use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and run `Debian Changelog Item Creator: Edit User Name` to set your name.
    - Run `Debian Changelog Item Creator: Edit Email Address` to set your email address.

2. **Create a New Changelog Entry**:
    - Place your cursor in the changelog file where you want to add a new entry.
    - Use the command palette to run `Debian Changelog Item Creator: New Changelog Item`.
    - The extension will automatically insert a new changelog entry with the incremented version number, current date, and your configured name and email.

## Extension Settings

This extension contributes the following settings:

- `debian-changelog-item-creator.userName`: Your name to be used in changelog entries.
- `debian-changelog-item-creator.emailAddress`: Your email address to be used in changelog entries.

## Commands

This extension contributes the following commands:

- `debian-changelog-item-creator.editUserName`: Prompts you to enter and save your name.
- `debian-changelog-item-creator.editEmailAddress`: Prompts you to enter and save your email address.
- `debian-changelog-item-creator.newChangelogItem`: Creates a new changelog entry at the current cursor position.

## Known Issues

- Ensure your cursor is placed correctly within the changelog file before running the `newChangelogItem` command to avoid errors.