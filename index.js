/*
 * ls-plugin-my-notes (https://www.wpvs.de)
 * © 2022  Dennis Schulmeister-Zimolong <dennis@pingu-mail.de>
 * License of this file: BSD 2-clause
 */
"use strict";

import Quill from "quill/dist/quill.min.js";
import "quill/dist/quill.snow.css";
import "./style.css";

/**
 * This plugin provides the custom element <my-notes> which can be placed
 * anywhere on the page to provide a rich text editor where the user can
 * make notes to the currently visible section. The notes are automatically
 * stored in the browser's local storage and will also be printed below the
 * section content.
 */
export default class LS_Plugin_MyNotes {
    /**
     * Constructor to configure the plugin.
     * @param {Object} config Configuration values
     */
    constructor(config) {
        // Interpret configuration values
        this._config = config || {};
        this._config.placeholder = this._config.placeholder || "My Notes …";
        this._config.printHeading = this._config.printHeading || "Notes";

        this._currentSection = undefined;
        this._editors = [];

        window.addEventListener("ls-callback-section-changed", event => {
            if (event.detail) {
                this._currentSection = event.detail;
                this._loadText();
            }
        });
    }

    /**
     * This function replaces all custom HTML tags with standard ones.
     * @param {Element} html DOM node with the slide definitions
     */
    preprocessHtml(html) {
        // Replace custom element with a plain <div> containing the editor
        let notesElements = document.querySelectorAll("my-notes");

        for (let noteElement of notesElements) {
            let editorElement = document.createElement("div");
            editorElement.classList.add("__lspmn__editor");
            editorElement.id = Math.random().toString(36).split(".")[1].replace(/\d/g, "E");;

            for (let i = 0; i < noteElement.attributes.length; i++) {
                let attribute = noteElement.attributes[i];
                editorElement.setAttribute(attribute.name, attribute.value);
            }

            for (let i = 0; i < noteElement.childNodes.length; i++) {
                editorElement.append(noteElement.childNodes[0]);
            }

            noteElement.replaceWith(editorElement);

            let editor = new Quill(`#${editorElement.id}`, {
                placeholder: this._config.placeholder,
                theme: "snow",
                modules: {
                    toolbar: [
                        [{"font": []}],
                        ["bold", "italic", "underline", "strike"],
                        [{"list": "ordered"}, {"list": "bullet"}],
                        [{"color": []}, {"background": []}],
                        [{"align": []}]
                    ],
                },
            });

            editor.on("text-change", () => {
                this._saveText(editor);
            });

            this._editors.push(editor);
        }

        this._loadText();
    }

    /**
     * Save the given text in the browser's local storage, assigned to the
     * ID of the currently visible section.
     *
     * @param {Object} editor Edtior whose text has changed
     */
    _saveText(editor) {
        // Save text in local storage
        if (!this._currentSection) return;
        let text = editor.root.innerHTML;

        let savedNotes = JSON.parse(localStorage.getItem("my-notes") || "{}");
        savedNotes[this._currentSection.id] = text;
        localStorage.setItem("my-notes", JSON.stringify(savedNotes));

        // Attach text to the section for printing
        let printElement = document.createElement("div");
        printElement.classList.add("__lspmn__print");
        printElement.classList.add("print-only");
        printElement.innerHTML = `<h2>${this._config.printHeading}</h2>\n${text}`;

        this._currentSection.querySelectorAll(".__lspmn__print").forEach(e => e.remove());
        this._currentSection.append(printElement);

        // Update other editors, if present
        for (let otherEditor of this._editors) {
            if (otherEditor === editor) continue;
            otherEditor.root.innerHTML = text;
        }
    }

    /**
     * Load the saved text for the current section into all editors.
     */
    _loadText() {
        if (!this._currentSection) return;

        let savedNotes = JSON.parse(localStorage.getItem("my-notes") || "{}");
        let text = savedNotes[this._currentSection.id] || "";

        for (let editor of this._editors) {
            editor.root.innerHTML = text;
            this._saveText(editor);
        }
    }
}
