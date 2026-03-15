import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    rules: {
      "no-unused-vars": "error",   
      "no-console": "warn",        
      "eqeqeq": "error",           
      "no-undef": "error",         
      "curly": "error",           

   
      "node/no-extraneous-require": "error",
      "node/no-missing-import": "error",
      "node/no-unpublished-import": "warn"
    },
  },
];
