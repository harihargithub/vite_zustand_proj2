import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-icons/styles/material.css";
import "@syncfusion/ej2-buttons/styles/material.css";
import "@syncfusion/ej2-splitbuttons/styles/material.css";
import "@syncfusion/ej2-inputs/styles/material.css";
import "@syncfusion/ej2-lists/styles/material.css";
import "@syncfusion/ej2-navigations/styles/material.css";
import "@syncfusion/ej2-popups/styles/material.css";
import "@syncfusion/ej2-richtexteditor/styles/material.css";

import {
  HtmlEditor,
  Image,
  Inject,
  Link,
  QuickToolbar,
  RichTextEditorComponent,
  Toolbar,
} from "@syncfusion/ej2-react-richtexteditor";

import { forwardRef } from "react";

const TextEditor = (props, ref) => {
  const toolbarSettings = {
    items: [
      "Bold",
      "Italic",
      "Underline",
      "StrikeThrough",
      "FontName",
      "FontSize",
      "FontColor",
      "BackgroundColor",
      "LowerCase",
      "UpperCase",
      "|",
      "Formats",
      "Alignments",
      "OrderedList",
      "UnorderedList",
      "Outdent",
      "Indent",
      "|",
      "CreateLink",
      "Image",
      "|",
      "ClearFormat",
      "Print",
      "SourceCode",
      "FullScreen",
      "|",
      "Undo",
      "Redo",
    ],
  };
  const quickToolbarSettings = {
    image: [
      "Replace",
      "Align",
      "Caption",
      "Remove",
      "InsertLink",
      "OpenImageLink",
      "-",
      "EditImageLink",
      "RemoveImageLink",
      "Display",
      "AltText",
      "Dimension",
    ],
  };

  return (
    <RichTextEditorComponent
      height={300}
      toolbarSettings={toolbarSettings}
      quickToolbarSettings={quickToolbarSettings}
      ref={ref}
    >
      <p>Fill in things in detail</p>
      <Inject services={[Toolbar, Image, Link, HtmlEditor, QuickToolbar]} />
    </RichTextEditorComponent>
  );
};

export default forwardRef(TextEditor);