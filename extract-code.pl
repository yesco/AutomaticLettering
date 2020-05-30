# perl script to extract code tags from html
# (actually to keep line numbers it just
#  // comment the oiginal line)

# assume it's an html file
$inscript = 0;

while (<>) {
    $inscript = 0 if m:</script:i;

    if ($inscript) {
	print;
    } else {
	print "// $_";
    }
    
    $inscript = 1 if m:<script:i;

    # TODO:  edge-case for single line <script>
    # TODO: how about html onkey="..."
}
