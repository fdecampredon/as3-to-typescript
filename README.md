#as3ToTypeScript

> A tool that helps porting as3 codebase to typescript


##Installation

Install this module with npm: 

```
npm install -g as3ToTypescript
```

##Usage

```
as3ToTypescript <sourceDir> <outputDir>
```

##Note

This tool will not magicly transform your as3 codebase into perfectly typescript, the goal is to transform the sources into *syntacticly* correct typescript, and even this goal is not perfectly respected. It also won't try to provide javascript implementation for flash libraries.

However unlike most attempt that I have seen this tool is based on a true action script parser, and so should be able to handle most of as3 construct and greatly ease the pain of porting a large code base writtne in as3 to typescript.
