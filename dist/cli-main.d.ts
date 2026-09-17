export interface CliIO {
    stdout(text: string): void;
    stderr(text: string): void;
    cwd: string;
    env: NodeJS.ProcessEnv;
    isTTY: boolean;
}
export declare const EXIT_OK = 0;
export declare const EXIT_FINDINGS = 1;
export declare const EXIT_USAGE = 2;
export declare function run(argv: readonly string[], io: CliIO): number;
