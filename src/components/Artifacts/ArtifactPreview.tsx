import React, { useMemo, memo } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import { SandpackPreview, SandpackProvider } from '@codesandbox/sandpack-react/unstyled';
import type { SandpackPreviewRef, SandpackFiles } from '@codesandbox/sandpack-react/unstyled';
import {
  getKey,
  getProps,
  sharedFiles,
  getTemplate,
  sharedOptions,
  getArtifactFilename,
} from './artifacts_config';
import { getMermaidFiles } from './mermaid';

/**
 * ArtifactPreview Component
 * 
 * Renders a preview of code artifacts using Sandpack, supporting both editor and preview modes.
 * Can handle different types of artifacts including React components, Mermaid diagrams, and HTML.
 *
 * @param {Object} props
 * @param {boolean} props.showEditor - Whether to show the full editor (true) or just the preview (false)
 * @param {Artifact} props.artifact - The artifact object containing type, language, and content
 * @param {React.MutableRefObject<SandpackPreviewRef>} props.previewRef - Ref for accessing the preview component
 */

export interface Artifact {
  type?: string;
  language?: string;
  content?: string;
}

// Helper function to process files into correct SandpackFiles format
const processSandpackFiles = (files: Record<string, string | undefined>): SandpackFiles => {
  const processedFiles: SandpackFiles = {};
  
  Object.entries(files).forEach(([key, value]) => {
    if (value !== undefined) {
      processedFiles[key] = { code: value };
    }
  });
  
  return processedFiles;
};

export const ArtifactPreview = memo(function ({
  showEditor = false,
  artifact,
  previewRef,
}: {
  showEditor?: boolean;
  artifact: Artifact;
  previewRef: React.MutableRefObject<SandpackPreviewRef>;
}) {
  console.log('ArtifactPreview received:', artifact);

  // Process the files
  const files = useMemo(() => {
    if (artifact.type?.includes('mermaid')) {
      return getMermaidFiles(artifact.content ?? '');
    }
    
    const filename = getArtifactFilename(artifact.type ?? '', artifact.language);
    const rawFiles = {
      [filename]: artifact.content,
    };
    
    // Process the files into the correct format
    const processedFiles = processSandpackFiles(rawFiles);
    console.log('Processed files:', processedFiles);
    return processedFiles;
  }, [artifact.type, artifact.content, artifact.language]);

  const template = useMemo(
    () => getTemplate(artifact.type ?? '', artifact.language),
    [artifact.type, artifact.language],
  );

  const sharedProps = useMemo(() => getProps(artifact.type ?? ''), [artifact.type]);

  // Process shared files
  const processedSharedFiles = useMemo(() => {
    return processSandpackFiles(sharedFiles as Record<string, string>);
  }, []);

  if (!artifact.content) {
    return null;
  }

  return showEditor ? (
    <Sandpack
      options={{
        showNavigator: true,
        editorHeight: '80vh',
        showTabs: true,
        ...sharedOptions,
      }}
      files={{
        ...files,
        ...processedSharedFiles,
      }}
      {...sharedProps}
      template={template}
    />
  ) : (
    <SandpackProvider
      files={{
        ...files,
        ...processedSharedFiles,
      }}
      options={sharedOptions}
      {...sharedProps}
      template={template}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={true}
        ref={previewRef}
      />
    </SandpackProvider>
  );
});