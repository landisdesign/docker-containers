load_secrets() {
	for file_list in $@
	do
		file_base="/run/secrets/${file_list}"
		for file in ${file_base}
		do
			var_name=$( basename "${file}" )
			case "${var_name}" in
				*[!a-zA-Z0-9_]* )
					echo "Secret named \"${var_name}\" will not be output due to invalid characters" >&2
					;;
				* )
					case $(file ${file} ) in
						*text* )
							eval "${var_name}=\"\$(cat \${file})\""
							;;
					esac
			esac
		done
	done
}
