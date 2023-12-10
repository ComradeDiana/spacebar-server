{
  description = "Spacebar server, written in Typescript.";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem flake-utils.lib.allSystems (system:
	let
		pkgs = import nixpkgs {
			inherit system;
		};
	in rec {
		packages.default = pkgs.buildNpmPackage {
			pname = "spacebar-server-ts";
			src = ./.;
			name = "spacebar-server-ts";
			meta.mainProgram = "start-bundle";

			#nativeBuildInputs = with pkgs; [ python3 ];
			npmDepsHash = "sha256-9yyOPogFi71Dcm7DKe4FJJz9d6uDtJsliDR+b32KKvA=";
			#makeCacheWritable = true;
			postPatch = ''
				substituteInPlace package.json --replace 'npx patch-package' '${pkgs.nodePackages.patch-package}/bin/patch-package'
			'';
		};
		devShell = pkgs.mkShell {
			buildInputs = with pkgs; [
				nodejs
				nodePackages.typescript
			];
		};
	}
    );
}
