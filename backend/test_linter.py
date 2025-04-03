"""Test file for checking flake8 line length configuration."""

# This is a 50-character line
short_line = "This is a short line."

# This is a 79-character line, which is the default PEP8 limit
seventy_nine_char_line = "This line has exactly 79 characters, which is the default PEP8 limit."

# This is a 100-character line
hundred_char_line = "This line has exactly 100 characters, which exceeds the default PEP8 limit but is under our 120 limit."

# This is a 120-character line (our configured limit)
one_twenty_char_line = "This line has exactly 120 characters, which is our configured maximum line length in the flake8 configuration file."

# This is a 130-character line (exceeds our limit)
one_thirty_char_line = "This line has exactly 130 characters, which exceeds our configured maximum line length and should trigger a flake8 warning/error when we run it." 